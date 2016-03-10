'use strict';

import * as List from './list';

import { cond } from './util';

import {
	isSymbol,
	isNumber,
	isString,
	isKeyword,
	isTrue,
	isFalse,
	isNil
} from './types';

export function _eval(exp, env) {
    return cond([
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
        () => true, () => {throw new Error('Eval: Unknown expression' + exp)}
    ]);
}

function apply(procedure, args) {
    return cond([
        () => isPrimitiveProcedure(procedure), () => applyPrimitiveProcedure(procedure, args),
        () => isCompoundProcedure(procedure), () => evalSequence(
                                                        procedureBody(procedure),
                                                        extendEnvironment(
                                                            procedureParameters(procedure),
                                                            List.arrayToList(args),
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
        return listOfValues(restOperand(exps), env, arr);
    }
}

function evalIf(exp, env) {
    if(isTrue(_eval(ifPredicate(exp), env))) {
        return _eval(ifConsequent(exp), env);
    } else {
        return _eval(ifAlternative(exp), env);
    }
}

function evalSequence(exps, env) {
    if(isLastExp(exps)) {
        return _eval(firstExp(exps), env);
    } else {
        _eval(firstExp(exps), env);
        return evalSequence(restExps(exps), env);
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
    return cond([
        () => isNumber(exp), () => true,
        () => isString(exp), () => true,
	    () => isKeyword(exp), () => true,
        () => true, () => false
    ]);
}

function isVariable(exp) {
    return isSymbol(exp);
}

function isQuoted(exp) {
    return isTaggedList(exp, 'quote');
}

function textOfQuotation(exp) {
    return first(rest(exp));
}

function isTaggedList(exp, tag) {
    if(List.isPair(exp)) {
        if(first(exp) === tag) {
            return true;
        }
    }
    return false;
}

function isAssignment(exp) {
	return isTaggedList(exp, 'set!');
}

function assignmentVariable(exp) {
	return first(rest(exp));
}

function assignmentValue(exp) {
	return first(rest(rest(exp)));
}

function isDefinition(exp) {
	return isTaggedList(exp, 'define');
}

function definitionVariable(exp) {
	return isSymbol(first(rest(exp))) ? first(rest(exp)) : first(first(rest(exp)));
}

function definitionValue(exp) {
	return isSymbol(first(rest(exp))) ? first(rest(rest(exp))) : makeLambda(rest(first(rest(exp))), rest(rest(exp)));
}

function isLambda(exp) {
	return isTaggedList(exp, 'lambda');
}

function lambdaParameters(exp) {
	return first(rest(exp));
}

function lambdaBody(exp) {
	return rest(rest(exp));
}

function makeLambda(parameters, body) {
	return List.cons('lambda', List.cons(parameters, body));
}

function isIf(exp) {
	return isTaggedList(exp, 'if');
}

function ifPredicate(exp) {
	return first(rest(exp));
}

function ifConsequent(exp) {
	return first(rest(rest(exp)));
}

function ifAlternative(exp) {
	if(rest(rest(rest(exp))) !== null) {
		return first(rest(rest(rest(exp))));
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
	return rest(exp);
}

function isLastExp(seq) {
	return rest(seq) === null;
}

function firstExp(seq) {
	return first(seq);
}

function restExps(seq) {
	return rest(seq);
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
	return first(exp);
}

function operands(exp) {
	return rest(exp);
}

function isNoOperands(ops) {
	return ops === null;
}

function firstOperand(ops) {
	return first(ops);
}

function restOperand(ops) {
	return rest(ops);
}

function isCond(exp) {
	return isTaggedList(exp, 'cond');
}

function condClauses(exp) {
	return rest(exp);
}

function isCondElseClause(clause) {
	return condPredicate(clause) === 'else';
}

function condPredicate(clause) {
	return first(clause);
}

function condActions(clause) {
	return rest(clause);
}

function condToIf(exp) {
	return expandClauses(condClauses(exp));
}

function expandClauses(clauses) {
	if(clauses === null) {
		return 'false';
	} else {
		let first = first(clauses);
		let rest = rest(clauses);
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

function makeProcedure(parameters, body, env) {
	return List.list('procedure', parameters, body, env);
}

function isCompoundProcedure(p) {
	return isTaggedList(p, 'procedure');
}

function procedureParameters(p) {
	return first(rest(p));
}

function procedureBody(p) {
	return first(rest(rest(p)));
}

function procedureEnvironment(p) {
	return first(rest(rest(rest(p))));
}


//Environment

function enclosingEnvironment(env) {
	return rest(env);
}

function firstFrame(env) {
	return first(env);
}

const theEmptyEnvironment = List.cons(null, null);

function isEmptyList(l) {
	return l.toString() === '[cons]' && first(l) === null && rest(l) === null;
}

function makeFrame(variables, values) {
	return List.cons(variables, values);
}

function frameVariables(frame) {
	return first(frame);
}

function frameValues(frame) {
	return rest(frame);
}

function addBindingToFrame(variable, value, frame) {
	List.setCar(frame, List.cons(variable, first(frame)));
	List.setCdr(frame, List.cons(value, rest(frame)));
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
				() => variable === first(vars), () => first(vals),
				() => true, () => scan(rest(vars), rest(vals))
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
				() => variable === first(vars), () => List.setCar(vals, value),
				() => true, () => scan(rest(vars), rest(vals))
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
			() => variable === first(vars), () => List.setCar(vals, value),
			() => true, () => scan(rest(vars), rest(vals))
		]);
	}
	return scan(frameVariables(frame), frameValues(frame));
}

//

const primitiveProcedures = List.list(
	List.list('car', args => first(args[0])),
	List.list('cdr', args => rest(args[0])),
	List.list('cons', args => List.cons(args[0], args[1])),
	List.list('nil?', args => isNil(args[0])),
	List.list('true?', args => isTrue(args[0])),
	List.list('false?', args => isFalse(args[0])),
	List.list('+', args => args.reduce((p,c)=>p+c, 0)),
	List.list('-', args => args.reduce((p,c)=>p-c)),
	List.list('printline', args => args[0])
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
	return first(rest(proc));
}

function primitiveProcedureNames() {
	return List.map(first, primitiveProcedures);
}

function primitiveProcedureObjects() {
	return List.map(proc => List.list('primitive', first(rest(proc))), primitiveProcedures);
}

function applyPrimitiveProcedure(proc, args) {
	return primitiveImplementation(proc)(args);
}