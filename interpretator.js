'use strict';

import { syntaxer } from './syntaxer';

import { map } from 'mori';

import { _eval, setupEnvironment, makeBegin } from './core';

const globalEnvironment = setupEnvironment();

export function interpretate(input, env = globalEnvironment) {
	return _eval(makeBegin(syntaxer(input)), env);
}