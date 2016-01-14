'use strict';

import * as List from './list';

//Lexer
const LIST_OPEN = 'LIST_OPEN';
const LIST_CLOSE = 'LIST_CLOSE';
const NUMBER = 'NUMBER';
const SYMBOL = 'SYMBOL';

export function syntaxer(input) {
	const tokenizer = tokenizerGenerator(input);
	const tree = makeAST(tokenizer);
	return astToLists(tree);
}

function* tokenizerGenerator(input) {
	const length = input.length;
	let currentToken = '';
	let currentType;
	for(let i = 0; i < length; i++) {
		const char = input[i];
		if(char === '(') {
			currentToken = '';
			yield {type: LIST_OPEN};
		} else if(char === ')') {
			if(currentToken !== '') {
				yield {
					type: currentType,
					token: currentToken
				}
			}
			currentToken = '';
			yield {type: LIST_CLOSE};
		} else if(/^\d$/.test(char)) {
			if(currentToken === '' || currentType === NUMBER) {
				currentType = NUMBER;
			}
			currentToken = currentToken + char;
		} else if(/^[^\(\)\s\d]$/.test(char)) {
			currentType = SYMBOL;
			currentToken = currentToken + char;
		} else if(/^\s$/.test(char)) {
			if(currentType && currentToken !== '') {
				yield {
					type: currentType,
					token: currentToken
				};
				currentToken = '';
			} else {
				currentToken = '';
			}
		}
	}
}

class Node {
	constructor(parent) {
		this.parent = parent;
		this.childs = [];
	}

	addChild(child) {
		this.childs.push(child);
	}
}

class SymbolToken {
	constructor(value) {
		this.value = value;
	}
}

class NumberToken {
	constructor(value) {
		this.value = value;
	}
}

function makeAST(tokenizer) {
	let currentNode = new Node();
	while(true) {
		const { value, done } = tokenizer.next();
		if(done) {
			break;
		} else {
			const { type, token } = value;
			switch(type) {
				case LIST_OPEN:
					const newNode = new Node(currentNode);
					currentNode.addChild(newNode);
					currentNode = newNode;
					break;
				case LIST_CLOSE:
					currentNode = currentNode.parent;
					break;
				case NUMBER:
					currentNode.addChild(new NumberToken(token));
					break;
				case SYMBOL:
					currentNode.addChild(new SymbolToken(token));
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