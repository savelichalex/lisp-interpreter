'use strict';

export class SymbolToken {
	constructor(value, namespace) {
		this.value = value;
		this.namespace = namespace; //TODO: set default
	}

	toString() {
		return this.namespace ? `'${this.namespace}/${this.value}` : `'${this.value}`;
	}

	inspect() {
		return this.toString();
	}
}

export class NumberToken {
	constructor(value) {
		this.value = +value;
	}

	toString() {
		return this.value;
	}

	inspect() {
		return this.toString();
	}
}

export class LiteralToken {
	constructor(value) {
		this.value = value;
	}

	toString() {
		return this.value;
	}

	inspect() {
		return this.toString();
	}
}

export class StringToken {
	constructor(value) {
		this.value = value;
	}

	toString() {
		return `"${this.value}"`;
	}

	inspect() {
		return this.toString();
	}
}

export class KeywordToken {
	constructor(value, namespace) {
		this.value = value;
		this.namespace = namespace; //TODO: set default
	}

	toString() {
		return this.namespace ? `:${this.namespace}/${this.value}` : `:${this.value}`;
	}

	inspect() {
		return this.toString();
	}
}

export function isSymbol(exp) {
	return exp instanceof SymbolToken;
}

export function isNumber(exp) {
	return exp instanceof NumberToken;
}

export function isTrue(exp) {
	return (exp instanceof LiteralToken) && (exp.value === 'true');
}

export function isFalse(exp) {
	return (exp instanceof LiteralToken) && (exp.value === 'false');
}

export function isNil(exp) {
	return (exp instanceof LiteralToken) && (exp.value === 'nil');
}

export function isString(exp) {
	return exp instanceof StringToken;
}

export function isKeyword(exp) {
	return exp instanceof KeywordToken;
}

export function isLiteral(exp) {
	return exp instanceof LiteralToken;
}