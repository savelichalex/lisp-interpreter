'use strict';

import { syntaxer } from './syntaxer';

import { map } from 'mori';

import { _eval, setupEnvironment } from './core';

const globalEnvironment = setupEnvironment();

export function interpretate(input) {
	return map(proc => _eval(proc, globalEnvironment), syntaxer(input));
}