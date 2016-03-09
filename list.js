function toStringList(cons, str = '') {
	const f = car(cons);
	const del = ' , ';
	function iter(cons, str) {
		if(cons === null) {
			return str
		} else {
			return iter(cdr(cons), str + del + car(cons));
		}
	}
	if(f) {
		return iter(cdr(cons), str + f);
	} else {
		return str;
	}
}

export function cons(first, second) {
	return new Cons(first, second);
}

class Cons {
	constructor(first, second) {
		this.car = first;
		this.cdr = second;
	}

	toString() {
		return 'List [' + toStringList(this) + ']';
	}

	inspect() {
		return 'List [' + toStringList(this) + ']';
	}
}

export function car(pair) {
	return pair.car;
}

export function cdr(pair) {
	return pair.cdr;
}

export function setCar(pair, car) {
	pair.car = car;
}

export function setCdr(pair, cdr) {
	pair.cdr = cdr;
}

export function isPair(pair) {
	return pair.toString() === '[cons]';
}

export function list() {
	return Object.keys(arguments).map(key => arguments[key]).map(i => cons(i, null)).reduceRight((prev, cur) => {
		setCdr(cur, prev);
		return cur;
	});
}

export function listLength(l, len = 0) {
	if(l === null) {
		return len;
	} else {
		return listLength(cdr(l), len + 1);
	}
}

export function listToArray(list) {
	let arr = [];
	let item = list;
	while (item !== null) {
		arr.push(car(item));
		item = cdr(item);
	}
	return arr;
}

export function map(proc, list) {
	if(list === null) {
		return list;
	} else {
		return cons(proc(car(list)), map(proc, cdr(list)));
	}
}

export function forEach(proc, list) {
	if(list === null) {
		return;
	} else {
		proc(car(list));
		return forEach(proc, cdr(list));
	}
}

export function arrayToList(arr) {
	return arr.map(i => cons(i, null)).reduceRight((prev, cur) => {
		setCdr(cur, prev);
		return cur;
	})
}