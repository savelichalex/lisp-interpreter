'use strict';

import * as List from './list';
import {
	ListNode,
	VectorNode,
	NumberToken,
	SymbolToken,
	StringToken,
	LiteralToken,
	KeywordToken
} from './types';

//Lexer
export const LIST_OPEN = 'LIST_OPEN';
export const LIST_CLOSE = 'LIST_CLOSE';
export const VECTOR_OPEN = 'VECTOR_OPEN';
export const VECTOR_CLOSE = 'VECTOR_CLOSE';
export const NUMBER = 'NUMBER';
export const SYMBOL = 'SYMBOL';
export const STRING = 'STRING';
export const LITERAL = 'LITERAL';
export const KEYWORD = 'KEYWORD';

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

export function syntaxer(input) {
	const tokenizer = tokenizerGenerator(input);
	const tree = makeAST(tokenizer);
	return astToLists(tree);
}

export function* tokenizerGenerator(input) {
	const length = input.length;
	let currentToken = '';

	for (let i = 0; i < length; i++) {
		const char = input[i];
		switch (true) {
			case /[^\(\)\[\]\s\n]/.test(char):
				currentToken += char;
				break;
			case /\(/.test(char):
				yield {type: LIST_OPEN};
				currentToken = '';
				break;
			case /\[/.test(char):
				yield {type: VECTOR_OPEN};
				currentToken = '';
				break;
			case /\)/.test(char):
				yield makeToken(currentToken);
				yield {type: LIST_CLOSE};
				currentToken = '';
				break;
			case /]/.test(char):
				yield makeToken(currentToken);
				yield {type: VECTOR_CLOSE};
				currentToken = '';
				break;
			case /[\s\n]/.test(char):
				if(currentToken !== '') {
					yield makeToken(currentToken);
					currentToken = '';
				}
				break;
		}
	}
}

export function makeAST(tokenizer) {
	let currentNode = new ListNode();
	while (true) {
		const {value, done} = tokenizer.next();
		if(done) {
			break;
		} else {
			const {type, token} = value;
			switch (type) {
				case LIST_OPEN:
					const newList = new ListNode(currentNode);
					currentNode.addChild(newList);
					currentNode = newList;
					break;
				case VECTOR_OPEN:
					const newVector = new VectorNode(currentNode);
					currentNode.addChild(newVector);
					currentNode = newVector;
					break;
				case LIST_CLOSE:
				case VECTOR_CLOSE:
					currentNode = currentNode.parent;
					break;
				case NUMBER:
					currentNode.addChild(new NumberToken(token));
					break;
				case SYMBOL:
					currentNode.addChild(new SymbolToken(token));
					break;
				case LITERAL:
					currentNode.addChild(new LiteralToken(token));
					break;
				case STRING:
					currentNode.addChild(new StringToken(token));
					break;
				case KEYWORD:
					currentNode.addChild(new KeywordToken(token));
					break;
			}
		}
	}
	return currentNode;
}

function astToLists(tree) {
	function scan(node) {
		function scanChild(child) {
			return child.map(c => List.cons(scan(c), null)).reduceRight((prev, cur) => {
				List.setCdr(cur, prev);
				return cur;
			})
		}

		if(node instanceof SymbolToken) {
			return node.value + '';
		} else if(node instanceof NumberToken) {
			return +node.value;
		} else if(node instanceof Node) {
			return scanChild(node.childs);
		}
	}

	return scan(tree);
}