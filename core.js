function cons(first, second) {
    return {
        car: first,
        cdr: second,
        toString() {
            return '[cons]'
        }
    }
}

function car(pair) {
    return pair.car;
}

function cdr(pair) {
    return pair.cdr;
}

function setCar(pair, car) {
	pair.car = car;
}

function setCdr(pair, cdr) {
	pair.cdr = cdr;
}

function isPair(pair) {
    return pair.toString() === '[cons]';
}

function list() {
	return Object.keys(arguments).map(key => arguments[key]).map(i => cons(i, null)).reduceRight((prev, cur) => {
		setCdr(cur, prev);
		return cur;
	});
}

function listLength(l, len = 0) {
	if(l === null) {
		return len;
	} else {
		return listLength(cdr(l), len + 1);
	}
}

function cond(arr) {
    let length = arr.length;
    for(let i = 0; i < length; i++) {
        if(arr[i]()) {
            return arr[++i]();
        } else {
            i++;
        }
    }
}

function eval(exp, env) {
    cond([
        () => isSelfEvaluating(exp), () => exp,
        () => isVariable(exp), () => lookupVariableValue(exp, env),
        () => isQuoted(exp), () => textOfQuotation(exp),
        () => isAssignment(exp), () => evalAssignment(exp, env),
        () => isDefinition(exp), () => evalDefinition(exp, env),
        () => isIf(exp), () => evalIf(exp, env),
        () => isLambda(exp), () => makeProcedure(lambdaParameters(exp), lambdaBody(exp), env),
        () => isBegin(exp), () => evalSequence(beginActions(exp), env),
        () => isCond(exp), () => eval(condToIf(exp), env),
        () => isApplication(exp), () => apply(eval(operator(exp), env), listOfValues(operands(exp), env)),
        () => true, () => {throw new Error('Eval: Unknown expression', exp)}
    ]);
}

function apply(procedure, args) {
    cond([
        () => isPrimitiveProcedure(procedure), () => applyPrimitiveProcedure(procedure, args),
        () => isCompoundProcedure(procedure), () => evalSequence(
                                                        procedureBody(procedure),
                                                        extendEnvironment(
                                                            procedureParameters(procedure),
                                                            args,
                                                            procedureEnvironment(procedure)
                                                        )
                                                    ),
        () => true, () => {throw new Error('Apply: Unknown procedure type', procedure)}
    ]);
}

function listOfValues(exps, env, arr = []) {
    if(isNoOperands(exps)) {
        return arr;
    } else {
        arr.push(eval(firstOperand(exps), env));
        listOfValues(restOperand(exps), env, arr);
    }
}

function evalIf(exp, env) {
    if(isTrue(eval(ifPredicate(exp), env))) {
        eval(ifConsequent(exp), env);
    } else {
        eval(ifAlternative(exp), env);
    }
}

function evalSequence(exps, env) {
    if(isLastExp(exps)) {
        eval(firstExp(exps), env);
    } else {
        eval(firstExp(exps), env);
        evalSequence(restExps(exps), env);
    }
}

function evalAssignment(exp, env) {
    setVariableValue(assignmentVariable(exp), eval(assignmentValue(exp), env), env);
    return 'ok';
}

function evalDefinition(exp, env) {
    defineVariable(definitionVariable(exp), eval(definitionValue(exp), env), env);
    return 'ok';
}

function isSelfEvaluating(exp) {
    cond([
        () => isNumber(exp), () => true,
        () => isString(exp), () => true,
        () => true, () => false
    ]);
}

function isNumber(exp) {
    return /^\d+$/gi.test(exp);
}

function isString(exp) {
    return false; //TODO: check strings in lisp
}

function isVariable(exp) {
    return isSymbol(exp);
}

function isSymbol(exp) {
    return /^\w[\d\w\?!\-]+$/gi.test(exp);
}

function isQuoted(exp) {
    return isTaggedList(exp, 'quote');
}

function textOfQuotation(exp) {
    return car(cdr(exp));
}

function isTaggedList(exp, tag) {
    if(isPair(exp)) {
        if(car(exp) === tag) {
            return true;
        }
    }
    return false;
}

function isAssignment(exp) {
	return isTaggedList(exp, 'set!');
}

function assignmentVariable(exp) {
	return car(cdr(exp));
}

function assignmentValue(exp) {
	return car(cdr(cdr(exp)));
}

function isDefinition(exp) {
	return isTaggedList(exp, 'define');
}

function definitionVariable(exp) {
	return isSymbol(car(cdr(exp))) ? car(cdr(exp)) : car(car(cdr(exp)));
}

function definitionValue(exp) {
	return isSymbol(car(cdr(exp))) ? car(cdr(cdr(exp))) : makeLambda(cdr(car(cdr(exp))), cdr(cdr(exp)));
}

function isLambda(exp) {
	return isTaggedList(exp, 'lambda');
}

function lambdaParameters(exp) {
	return car(cdr(exp));
}

function lambdaBody(exp) {
	return cdr(cdr(exp));
}

function makeLambda(parameters, body) {
	return cons('lambda', cons(parameters, body));
}

function isIf(exp) {
	return isTaggedList(exp, 'if');
}

function ifPredicate(exp) {
	return car(cdr(exp));
}

function ifConsequent(exp) {
	return car(cdr(cdr(exp)));
}

function ifAlternative(exp) {
	if(cdr(cdr(cdr(exp))) === null) {
		return car(cdr(cdr(cdr(exp))));
	} else {
		return 'false';
	}
}

function makeIf(predicate, consequent, alternative) {
	return list('if', predicate, consequent, alternative);
}

function isBegin(exp) {
	return isTaggedList(exp, 'begin');
}

function beginActions(exp) {
	return cdr(exp);
}

function isLastExp(seq) {
	return cdr(seq) === null;
}

function firstExp(seq) {
	return car(seq);
}

function restExps(seq) {
	return cdr(seq);
}

function makeBegin(seq) {
	return cons('begin', seq);
}

function sequenceToExp(seq) {
	return cond([
		() => seq === null, () => seq,
		() => isLastExp(seq), () => firstExp(seq),
		() => true, () => makeBegin(seq)
	]);
}

function isApplication(exp) {
	return isPair(exp);
}

function operator(exp) {
	return car(exp);
}

function operands(exp) {
	return cdr(exp);
}

function isNoOperands(ops) {
	return ops === null;
}

function firstOperand(ops) {
	return car(ops);
}

function restOperand(ops) {
	return cdr(ops);
}

function isCond(exp) {
	return isTaggedList(exp, 'cond');
}

function condClauses(exp) {
	return cdr(exp);
}

function isCondElseClause(clause) {
	return condPredicate(clause) === 'else';
}

function condPredicate(clause) {
	return car(clause);
}

function condActions(clause) {
	return cdr(clause);
}

function condToIf(exp) {
	return expandClauses(condClauses(exp));
}

function expandClauses(clauses) {
	if(clauses === null) {
		return 'false';
	} else {
		let first = car(clauses);
		let rest = cdr(clauses);
		if(isCondElseClause(first)) {
			if(rest === null) {
				return sequenceToExp(condActions(first))
			} else {
				throw new Error('COND->IF: Else clause not last', clauses);
			}
		} else {
			return makeIf(condPredicate(first), sequenceToExp(condActions(first)), expandClauses(rest));
		}
	}
}

function isTrue(x) {
	return x !== false; //TODO: make it for lisp rules
}

function isFalse(x) {
	return x === false; //TODO: make it for lisp rules
}

function makeProcedure(parameters, body, env) {
	return list('procedure', parameters, body, env);
}

function isCompoundProcedure(p) {
	return isTaggedList(p, 'procedure');
}

function procedureParameters(p) {
	return car(cdr(p));
}

function procedureBody(p) {
	return car(cdr(cdr(p)));
}

function procedureEnvironment(p) {
	return car(cdr(cdr(cdr(p))));
}


//Environment

function enclosingEnvironment(env) {
	return cdr(env);
}

function firstFrame(env) {
	return car(env);
}

const theEmptyEnvironment = cons(null, null);

function isEmptyList(l) {
	return l.toString() === '[cons]' && car(l) === null && cdr(l) === null;
}

function makeFrame(variables, values) {
	return cons(variables, values);
}

function frameVariables(frame) {
	return car(frame);
}

function frameValues(frame) {
	return cdr(frame);
}

function addBindingToFrame(variable, value, frame) {
	setCar(frame, cons(variable, car(frame)));
	setCdr(frame, cons(value, cdr(frame)));
}

function extendEnvironment(vars, vals, baseEnv) {
	if(listLength(vars) === listLength(vals)) {
		return cons(makeFrame(vars, vals), baseEnv);
	} else {
		if(listLength(vars) < listLength(vals)) {
			throw new Error('Given little count of arguments', vars, vals);
		} else {
			throw new Error('Given too much arguments', vars, vals);
		}
	}
}

function lookupVariableValue(variable, env) {
	function envLoop(env) {
		function scan(vars, vals) {
			return cond([
				() => vars === null, () => envLoop(enclosingEnvironment(env)),
				() => variable === car(vars), () => car(vals),
				() => true, () => scan(cdr(vars), cdr(vals))
			])
		}
		if(isEmptyList(env)) {
			throw new Error('Unbound variable', variable);
		} else {
			let frame = firstFrame(env);
			return scan(frameVariables(frame), frameValues(frame));
		}
	}
	return envLoop(env);
}

function setVariableValue(variable, value, env) {
	function envLoop(env) {
		function scan(vars, vals) {
			return cond([
				() => vars === null, () => envLoop(enclosingEnvironment(env)),
				() => variable === car(vars), () => setCar(vals, value),
				() => true, () => scan(cdr(vars), cdr(vals))
			])
		}
		if(isEmptyList(env)) {
			throw new Error('Unbound variable', variable);
		} else {
			let frame = firstFrame(env);
			return scan(frameVariables(frame), frameValues(frame));
		}
	}
	return envLoop(env);
}

function defineVariable(variable, value, env) {
	let frame = firstFrame(env);
	function scan(vars, vals) {
		return cond([
			() => vars === null, () => addBindingToFrame(variable, value, frame),
			() => variable === car(vars), () => setCar(vals, value),
			() => true, () => scan(cdr(vars), cdr(vals))
		]);
	}
	return scan(frameVariables(frame), frameValues(frame));
}

//

function setupEnvironment() {
	let initialEnv = extendEnvironment(primitiveProcedureNames(), primitiveProcedureObjects(), theEmptyEnvironment);
	defineVariable('true', true, initialEnv);
	defineVariable('false', false, initialEnv);
	return initialEnv;
}

const globalEnvironment = setupEnvironment();

