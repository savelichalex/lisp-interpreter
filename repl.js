'use strict';

//REPL

import { interpretate } from './interpretator';
import readline from 'readline';

const inputPrompt = ";;; Input Eval:";
const outputPrompt = ";;; Output Eval:";

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

console.log('Clojure interpretator written on JavaScript');
console.log(inputPrompt);
rl.on('line', line => {
	try {
		const res = interpretate(line);
		console.log(outputPrompt, res);
		console.log(inputPrompt);
	} catch (e) {
		console.log(e.message);
		console.log(e.stack);
		console.log(inputPrompt);
	}
}).on('close', () => {
	console.log('REPL closing.');
	process.exit(0);
});