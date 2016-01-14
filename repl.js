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

console.log('Lisp interpretator written on JavaScript');
console.log(inputPrompt);
rl.on('line', line => {
	console.log(outputPrompt, interpretate(line));
	console.log(inputPrompt);
}).on('close', () => {
	console.log('REPL closing.');
	process.exit(0);
});