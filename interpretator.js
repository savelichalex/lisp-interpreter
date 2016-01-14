'use strict';

import { syntaxer } from './syntaxer';

import { _eval, setupEnvironment } from './core';

const globalEnvironment = setupEnvironment();

export const interpretate = syntaxer;