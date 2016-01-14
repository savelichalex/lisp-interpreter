'use strict';

import * as List from './list';

import { cond } from './util';

export function _eval(exp, env) {
    cond([
        () => isSelfEvaluating(exp), () => exp,
        () => isVariable(exp), () => lookupVariableValue(exp, env),
        () => isQuoted(exp), () => textOfQuotation(exp),
        () => isAssignment(exp), () => evalAssignment(exp, env),
        () => isDefinition(exp), () => evalDefinition(exp, env),
        () => isIf(exp), () => evalIf(exp, env),
        () => isLambda(exp), () => makeProcedure(lambdaParameters(exp), lambdaBody(exp), env),
        () => isBegin(exp), () => evalSequence(beginActions(exp), env),
        () => isCond(exp), () => _eval(condToIf(exp), env),
        () => isApplication(exp), () => apply(_eval(operator(exp), env), listOfValues(operands(exp), env)),
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
        arr.push(_eval(firstOperand(exps), env));
        listOfValues(restOperand(exps), env, arr);
    }
}

function evalIf(exp, env) {
    if(isTrue(_eval(ifPredicate(exp), env))) {
        _eval(ifConsequent(exp), env);
    } else {
        _eval(ifAlternative(exp), env);
    }
}

function evalSequence(exps, env) {
    if(isLastExp(exps)) {
        _eval(firstExp(exps), env);
    } else {
        _eval(firstExp(exps), env);
        evalSequence(restExps(exps), env);
    }
}

function evalAssignment(exp, env) {
    setVariableValue(assignmentVariable(exp), _eval(assignmentValue(exp), env), env);
    return 'ok';
}

function evalDefinition(exp, env) {
    defineVariable(definitionVariable(exp), _eval(definitionValue(exp), env), env);
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

function isString() {
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
    return List.car(List.cdr(exp));
}

function isTaggedList(exp, tag) {
    if(List.isPair(exp)) {
        if(List.car(exp) === tag) {
            return true;
        }
    }
    return false;
}

function isAssignment(exp) {
	return isTaggedList(exp, 'set!');
}

function assignmentVariable(exp) {
	return List.car(List.cdr(exp));
}

function assignmentValue(exp) {
	return List.car(List.cdr(List.cdr(exp)));
}

function isDefinition(exp) {
	return isTaggedList(exp, 'define');
}

function definitionVariable(exp) {
	return isSymbol(List.car(List.cdr(exp))) ? List.car(List.cdr(exp)) : List.car(List.car(List.cdr(exp)));
}

function definitionValue(exp) {
	return isSymbol(List.car(List.cdr(exp))) ? List.car(List.cdr(List.cdr(exp))) : makeLambda(List.cdr(List.car(List.cdr(exp))), List.cdr(List.cdr(exp)));
}

function isLambda(exp) {
	return isTaggedList(exp, 'lambda');
}

function lambdaParameters(exp) {
	return List.car(List.cdr(exp));
}

function lambdaBody(exp) {
	return List.cdr(List.cdr(exp));
}

function makeLambda(parameters, body) {
	return List.cons('lambda', List.cons(parameters, body));
}

function isIf(exp) {
	return isTaggedList(exp, 'if');
}

function ifPredicate(exp) {
	return List.car(List.cdr(exp));
}

function ifConsequent(exp) {
	return List.car(List.cdr(List.cdr(exp)));
}

function ifAlternative(exp) {
	if(List.cdr(List.cdr(List.cdr(exp))) === null) {
		return List.car(List.cdr(List.cdr(List.cdr(exp))));
	} else {
		return 'false';
	}
}

function makeIf(predicate, consequent, alternative) {
	return List.list('if', predicate, consequent, alternative);
}

function isBegin(exp) {
	return isTaggedList(exp, 'begin');
}

function beginActions(exp) {
	return List.cdr(exp);
}

function isLastExp(seq) {
	return List.cdr(seq) === null;
}

function firstExp(seq) {
	return List.car(seq);
}

function restExps(seq) {
	return List.cdr(seq);
}

function makeBegin(seq) {
	return List.cons('begin', seq);
}

function sequenceToExp(seq) {
	return cond([
		() => seq === null, () => seq,
		() => isLastExp(seq), () => firstExp(seq),
		() => true, () => makeBegin(seq)
	]);
}

function isApplication(exp) {
	return List.isPair(exp);
}

function operator(exp) {
	return List.car(exp);
}

function operands(exp) {
	return List.cdr(exp);
}

function isNoOperands(ops) {
	return ops === null;
}

function firstOperand(ops) {
	return List.car(ops);
}

function restOperand(ops) {
	return List.cdr(ops);
}

function isCond(exp) {
	return isTaggedList(exp, 'cond');
}

function condClauses(exp) {
	return List.cdr(exp);
}

function isCondElseClause(clause) {
	return condPredicate(clause) === 'else';
}

function condPredicate(clause) {
	return List.car(clause);
}

function condActions(clause) {
	return List.cdr(clause);
}

function condToIf(exp) {
	return expandClauses(condClauses(exp));
}

function expandClauses(clauses) {
	if(clauses === null) {
		return 'false';
	} else {
		let first = List.car(clauses);
		let rest = List.cdr(clauses);
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

function isNull(x) {
	return x === null;
}

function makeProcedure(parameters, body, env) {
	return List.list('procedure', parameters, body, env);
}

function isCompoundProcedure(p) {
	return isTaggedList(p, 'procedure');
}

function procedureParameters(p) {
	return List.car(List.cdr(p));
}

function procedureBody(p) {
	return List.car(List.cdr(List.cdr(p)));
}

function procedureEnvironment(p) {
	return List.car(List.cdr(List.cdr(List.cdr(p))));
}


//Environment

function enclosingEnvironment(env) {
	return List.cdr(env);
}

function firstFrame(env) {
	return List.car(env);
}

const theEmptyEnvironment = List.cons(null, null);

function isEmptyList(l) {
	return l.toString() === '[cons]' && List.car(l) === null && List.cdr(l) === null;
}

function makeFrame(variables, values) {
	return List.cons(variables, values);
}

function frameVariables(frame) {
	return List.car(frame);
}

function frameValues(frame) {
	return List.cdr(frame);
}

function addBindingToFrame(variable, value, frame) {
	List.setCar(frame, List.cons(variable, List.car(frame)));
	List.setCdr(frame, List.cons(value, List.cdr(frame)));
}

function extendEnvironment(vars, vals, baseEnv) {
	if(List.listLength(vars) === List.listLength(vals)) {
		return List.cons(makeFrame(vars, vals), baseEnv);
	} else {
		if(List.listLength(vars) < List.listLength(vals)) {
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
				() => variable === List.car(vars), () => List.car(vals),
				() => true, () => scan(List.cdr(vars), List.cdr(vals))
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
				() => variable === List.car(vars), () => List.setCar(vals, value),
				() => true, () => scan(List.cdr(vars), List.cdr(vals))
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
			() => variable === List.car(vars), () => List.setCar(vals, value),
			() => true, () => scan(List.cdr(vars), List.cdr(vals))
		]);
	}
	return scan(frameVariables(frame), frameValues(frame));
}

//

const primitiveProcedures = List.list(
	List.list('List.car', List.car),
	List.list('List.cdr', List.cdr),
	List.list('List.cons', List.cons),
	List.list('null?', isNull)
);

export function setupEnvironment() {
	let initialEnv = extendEnvironment(primitiveProcedureNames(), primitiveProcedureObjects(), theEmptyEnvironment);
	defineVariable('true', true, initialEnv);
	defineVariable('false', false, initialEnv);
	return initialEnv;
}

function isPrimitiveProcedure(proc) {
	return isTaggedList(proc, 'primitive');
}

function primitiveImplementation(proc) {
	return List.car(List.cdr(proc));
}

function primitiveProcedureNames() {
	return List.map(List.car, primitiveProcedures);
}

function primitiveProcedureObjects() {
	return List.map(proc => List.list('primitive', List.car(List.cdr(proc))), primitiveProcedures);
}

function applyPrimitiveProcedure(proc, args) {
	return proc.apply(List.listToArray(args));
}