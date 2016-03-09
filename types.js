'use strict';

class Node {
	constructor(parent) {
		this.parent = parent;
		this.childs = [];
	}

	addChild(child) {
		this.childs.push(child);
	}
}

export class ListNode extends Node {}
export class VectorNode extends Node {}


export class SymbolToken {
	constructor(value, namespace) {
		this.value = value;
		this.namespace = namespace; //TODO: set default
	}
}

export class NumberToken {
	constructor(value) {
		this.value = value;
	}
}

export class LiteralToken {
	constructor(value) {
		this.value = value;
	}
}

export class StringToken {
	constructor(value) {
		this.value = value;
	}
}

export class KeywordToken {
	constructor(value, namespace) {
		this.value = value;
		this.namespace = namespace; //TODO: set default
	}
}

export function isSymbol(exp) {
	return exp instanceof SymbolToken;
}

export function isNumber(exp) {
	return exp instanceof NumberToken;
}

export function isTrue(exp) {
	return (exp instanceof LiteralToken) && (exp.value = 'true');
}

export function isFalse(exp) {
	return (exp instanceof LiteralToken) && (exp.value = 'false');
}

export function isNil(exp) {
	return (exp instanceof LiteralToken) && (exp.value = 'nil');
}

export function isString(exp) {
	return exp instanceof StringToken;
}

export function isKeyword(exp) {
	return exp instanceof KeywordToken;
}