'use strict';

import { list, vector, concat, conj, peek, pop, isList, isVector, isSeq } from 'mori';

import {
	NumberToken,
	SymbolToken,
	StringToken,
	LiteralToken,
	KeywordToken
} from './types';

//Lexer
const LIST_OPEN = 'LIST_OPEN';
const LIST_CLOSE = 'LIST_CLOSE';
const VECTOR_OPEN = 'VECTOR_OPEN';
const VECTOR_CLOSE = 'VECTOR_CLOSE';
const NUMBER = 'NUMBER';
const SYMBOL = 'SYMBOL';
const STRING = 'STRING';
const LITERAL = 'LITERAL';
const KEYWORD = 'KEYWORD';

const SYMBOL_HEAD = 'a-z\\*\\+\\!\\-\\_\\?\\.\\~\\@';
const SYMBOL_TAIL = SYMBOL_HEAD + '0-9';
const NumberPattern = /^(')?\d+/;
const StringPattern = /^'?"(([^\\"]|\\\\|\\")*)/;
const LiteralPattern = /^'?(true|false|nil)$/;
const SymbolPattern =
	new RegExp(
		`^\'?(?:([${SYMBOL_HEAD}][${SYMBOL_TAIL}]*)\\/)?([${SYMBOL_HEAD}${'\\/|='}][${SYMBOL_TAIL}]*)`,
		'i'
	);
const KeywordPattern =
	new RegExp(
		`^\'?::?(?:([${SYMBOL_HEAD}][${SYMBOL_TAIL}]*)\\/)?([${SYMBOL_HEAD}${'\\/|='}][${SYMBOL_TAIL}]*)`,
		'i'
	);

export function syntaxer(input) {
	return makeAST(tokenizerGenerator(input));
}

function makeToken(token) {
	if(NumberPattern.test(token)) {
		return {
			type: NUMBER,
			token
		};
	} else if(StringPattern.test(token)) {
		const [,string] = StringPattern.exec(token);
		return {
			type: STRING,
			token: string
		};
	} else if(LiteralPattern.test(token)) {
		const [,lit] = LiteralPattern.exec(token);
		return {
			type: LITERAL,
			token: lit
		};
	} else if(SymbolPattern.test(token)) {
		const [,namespace,symbol] = SymbolPattern.exec(token) || [];
		return {
			type: SYMBOL,
			token: symbol ? symbol : namespace,
			namespace: symbol ? namespace : void 0
		};
	} else if(KeywordPattern.test(token)) {
		const [,namespace,keyword] = KeywordPattern.exec(token) || [];
		return {
			type: KEYWORD,
			token: keyword ? keyword : namespace,
			namespace: keyword ? namespace : void 0
		};
	}
}

function* tokenizerGenerator(input) {
	input = input + "\n";
	const length = input.length;
	let currentToken = '';
	let string = false;
	let comment = false;
	for (let i = 0; i < length; i++) {
		const char = input[i];
		switch (true) {
			case /[^\(\)\[\]\s\n;"]/.test(char):
				currentToken += char;
				break;
			case /\(/.test(char):
				if(!string && !comment) {
					yield {type: LIST_OPEN};
					currentToken = '';
				}
				break;
			case /\[/.test(char):
				if(!string && !comment) {
					yield {type: VECTOR_OPEN};
					currentToken = '';
				}
				break;
			case /\)/.test(char):
				if(!string && !comment) {
					if(currentToken !== '') {
						yield makeToken(currentToken);
					}
					yield {type: LIST_CLOSE};
					currentToken = '';
				}
				break;
			case /]/.test(char):
				if(!string && !comment) {
					if(currentToken !== '') {
						yield makeToken(currentToken);
					}
					yield {type: VECTOR_CLOSE};
					currentToken = '';
				}
				break;
			case /"/.test(char):
				string = !string;
				currentToken += char;
				break;
			case /;/.test(char):
				comment = true;
				break;
			case /\s/.test(char):
				if(!string && !comment) {
					if(currentToken !== '') {
						yield makeToken(currentToken);
						currentToken = '';
					}
				} else {
					currentToken += char;
				}
				break;
			case /\n/.test(char):
				if(comment) {
					comment = false;
					string = false;
					currentToken = '';
				} else if(currentToken !== '') {
					yield makeToken(currentToken);
					currentToken = '';
				}
				break;
		}
	}
}

function makeAST(tokenizer) {
	let parents = vector();
	let currentNode = list();
	
	function add(node, val) {
		if(isList(node) || isSeq(node)) {
			return concat(node, list(val));
		} else if(isVector(node)) {
			return conj(node, val);
		}
	}
	
	while (true) {
		const {value, done} = tokenizer.next();
		if(done) {
			break;
		} else {
			const {type, token, namespace} = value;
			switch (type) {
				case LIST_OPEN:
					const newList = list();
					parents = conj(parents, currentNode);
					currentNode = newList;
					break;
				case VECTOR_OPEN:
					const newVector = vector();
					parents = conj(parents, currentNode);
					currentNode = newVector;
					break;
				case LIST_CLOSE:
				case VECTOR_CLOSE:
					const parent = peek(parents);
					parents = pop(parents);
					currentNode = add(parent, currentNode);
					break;
				case NUMBER:
					currentNode = add(currentNode, new NumberToken(token));
					break;
				case SYMBOL:
					currentNode = add(currentNode, new SymbolToken(token, namespace));
					break;
				case LITERAL:
					currentNode = add(currentNode, new LiteralToken(token));
					break;
				case STRING:
					currentNode = add(currentNode, new StringToken(token));
					break;
				case KEYWORD:
					currentNode = add(currentNode, new KeywordToken(token, namespace));
					break;
			}
		}
	}
	return currentNode;
}