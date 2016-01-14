'use strict';

export function cond(arr) {
	let length = arr.length;
	for(let i = 0; i < length; i++) {
		if(arr[i]()) {
			return arr[++i]();
		} else {
			i++;
		}
	}
}