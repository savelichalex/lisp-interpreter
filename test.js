'use strict';

import {expect} from 'chai';

import {syntaxer} from './syntaxer';
import { _eval, setupEnvironment, primitiveProcedureNames, primitiveProcedureObjects } from './core';
import {first, rest, nth, isVector, toJs, count, list, seq} from 'mori';

import { SymbolToken, KeywordToken, StringToken, NumberToken, LiteralToken } from './types';

describe('Clojure interpreter', () => {
	describe('Syntaxer', () => {
		it('should make AST', () => {
			const ast = syntaxer('(defn x [:a :b] "Hello")');
			const functionDefinition = first(ast);

			expect(nth(functionDefinition, 0)).to.be.instanceOf(SymbolToken);
			expect(nth(functionDefinition, 1)).to.be.instanceOf(SymbolToken);
			expect(isVector(nth(functionDefinition, 2))).to.be.true;
			expect(first(nth(functionDefinition, 2))).to.be.instanceOf(KeywordToken);
			expect(first(rest(nth(functionDefinition, 2)))).to.be.instanceOf(KeywordToken);
			expect(nth(functionDefinition, 3)).to.be.instanceOf(StringToken);
		});
	});

	describe('Eval', () => {
		describe('Self evaluating', () => {
			it('should eval number', () => {
				const ast = syntaxer('1000');
				const number = _eval(first(ast));

				expect(number).to.be.instanceOf(NumberToken);
				expect(number.value).to.equal(1000);
			});

			it('should eval string', () => {
				const ast = syntaxer('"Test string"');
				const string = _eval(first(ast));

				expect(string).to.be.instanceOf(StringToken);
				expect(string.value).to.equal('Test string');
			});

			it('should eval keyword', () => {
				const ast = syntaxer(':test/keyword');
				const keyword = _eval(first(ast));

				expect(keyword).to.be.instanceOf(KeywordToken);
				expect(keyword.value).to.equal('keyword');
				expect(keyword.namespace).to.equal('test');
			});

			it('should eval literal', () => {
				const ast = syntaxer('true');
				const literal = _eval(first(ast));

				expect(literal).to.be.instanceOf(LiteralToken);
				expect(literal.value).to.equal('true');
			});

			it('should eval vector', () => {
				const ast = syntaxer('[:a :b]');
				const vector = _eval(first(ast));

				expect(isVector(vector)).to.be.true;
				expect(nth(vector, 0)).to.be.instanceOf(KeywordToken);
				expect(nth(vector, 1)).to.be.instanceOf(KeywordToken);
			});
		});

		describe('If statement', () => {
			it('should eval', () => {
				const ast = syntaxer('(if (true? true) "yes" "no")');
				const result = _eval(first(ast), setupEnvironment());
		
				expect(result).to.be.instanceOf(StringToken);
				expect(result.value).to.equal('yes');

				const ast2 = syntaxer('(if (true? false) "yes" "no")');
				const result2 = _eval(first(ast2), setupEnvironment());
				expect(result2).to.be.instanceOf(StringToken);
				expect(result2.value).to.equal('no');
			});
		});
		
		describe('Cond statement', () => {
			it('should eval', () => {
				const ast = syntaxer('(cond (= "test" "test") "yes" :else "no")');
				const result = _eval(first(ast), setupEnvironment());

				expect(result).to.be.instanceOf(StringToken);
				expect(result.value).to.equal('yes');
				
				const ast2 = syntaxer('(cond (= "test2" "test") "yes" :else "no")');
				const result2 = _eval(first(ast2), setupEnvironment());

				expect(result2).to.be.instanceOf(StringToken);
				expect(result2.value).to.equal('no');
			});
		});

		describe('Lookup', () => {
			it('should eval primitive variable', () => {
				const ast = syntaxer('true?');
				const truePredicate = _eval(first(ast), setupEnvironment());

				expect(first(truePredicate)).to.equal('primitive');
			});
		});
		
		describe('Lambda', () => {
			it('should eval fn statement in procedure', () => {
				const ast = syntaxer('(fn [a] a)');
				const lambda = _eval(first(ast));
				
				expect(first(lambda)).to.equal('procedure');
			});

			it('should eval and then apply to arguments', () => {
				const ast = syntaxer('((fn [a] a) 1)');
				const result = _eval(first(ast), setupEnvironment());
				
				expect(result).to.be.instanceOf(NumberToken);
				expect(result.value).to.equal(1);
			});
		});
		
		describe('Definition', () => {
			it('should eval simple definition of primitive value', () => {
				const ast = syntaxer('(do (def a 1) (if (= a 1) "yes" :else "no"))');
				const result = _eval(first(ast), setupEnvironment());

				expect(result).to.be.instanceOf(StringToken);
				expect(result.value).to.equal('yes');
			});
			
			it('should eval function definition', () => {
				const ast = syntaxer('(do (defn a [a] a) (if (= (a 1) 1) "yes" :else "no"))');
				const result = _eval(first(ast), setupEnvironment());

				expect(result).to.be.instanceOf(StringToken);
				expect(result.value).to.equal('yes');
			});
		});
		
		describe('Assignment', () => {
			it('should set variable', () => {
				const ast = syntaxer('(do (def a 1) (set! a 2) (if (= a 2) "yes" :else "no"))');
				const result = _eval(first(ast), setupEnvironment());

				expect(result).to.be.instanceOf(StringToken);
				expect(result.value).to.equal('yes');
			});
		});
	});

	describe('Setup environment', () => {
		it('should get primitive procedures names', () => {
			expect(
				toJs(primitiveProcedureNames())
			).to.deep.equal(
				["car", "cdr", "cons", "nil?", "true?", "false?", "+", "-", "=", "println"]
			);
		});
		
		it('should get primitive procedures objects', () => {
			const objs = primitiveProcedureObjects();
			expect(count(objs)).to.equal(10);
			expect(first(first(objs))).to.equal('primitive');
		});
		
		it('should setup', () => {
			expect(count(setupEnvironment())).to.equal(2);
		});
	});
});