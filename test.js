'use strict';

import {expect} from 'chai';

import {syntaxer} from './syntaxer';
import { _eval } from './core';
import {first, rest, nth, isVector} from 'mori';

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
});