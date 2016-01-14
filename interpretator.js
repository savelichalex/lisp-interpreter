'use strict';

import { syntaxer } from './syntaxer';

import { car, map, listToArray } from './list';

import { _eval, setupEnvironment } from './core';

const globalEnvironment = setupEnvironment();

export function interpretate(input) {
	return listToArray(map(proc => _eval(proc, globalEnvironment), syntaxer(input)));
}