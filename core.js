'use strict';

import {
	isSeq,
	isVector,
	list,
	seq,
	vector,
	map,
	conj,
	count,
	first,
	rest,
	nth,
	cons,
	reduce,
	reduceKV,
	zipmap,
	toJs
} from 'mori';

import { cond } from './util';

import {
	isSymbol,
	isNumber,
	isString,
	isKeyword,
	isLiteral,
	isTrue,
	isFalse,
	isNil,
	LiteralToken
} from './types';

export function _eval(exp, env) {
    return cond([
        () => isSelfEvaluating(exp), () => exp,
        () => isVariable(exp), () => lookupVariableValue(exp.value, env),
        () => isQuoted(exp), () => textOfQuotation(exp),
        () => isAssignment(exp), () => evalAssignment(exp, env),
        () => isDefinition(exp), () => evalDefinition(exp, env),
        () => isIf(exp), () => evalIf(exp, env),
        () => isLambda(exp), () => makeProcedure(lambdaParameters(exp), lambdaBody(exp), env),
        () => isBegin(exp), () => evalSequence(beginActions(exp), env),
        () => isCond(exp), () => _eval(condToIf(exp), env),
        () => isApplication(exp), () => apply(_eval(operator(exp), env), listOfValues(operands(exp), env)),
        () => true, () => {throw new Error('Eval: Unknown expression ' + exp)}
    ]);
}

function apply(procedure, args) {
    return cond([
        () => isPrimitiveProcedure(procedure), () => applyPrimitiveProcedure(procedure, args),
        () => isCompoundProcedure(procedure), () => evalSequence(
                                                        procedureBody(procedure),
                                                        extendEnvironment(
                                                            map(v => v.value, procedureParameters(procedure)), //TODO: need change primitives to SymbolToken
                                                            seq(args),
                                                            procedureEnvironment(procedure)
                                                        )
                                                    ),
        () => true, () => {throw new Error('Apply: Unknown procedure type', procedure)}
    ]);
}

function listOfValues(exps, env, arr = vector()) {
    if(isNoOperands(exps)) {
        return arr;
    } else {
        arr = conj(arr, _eval(firstOperand(exps), env));
        return listOfValues(restOperand(exps), env, arr);
    }
}

function evalIf(exp, env) {
	const resultInPredicate = _eval(ifPredicate(exp), env);
    if(isFalse(resultInPredicate) || isNil(resultInPredicate)) {
        return _eval(ifAlternative(exp), env);
    } else {
	    return _eval(ifConsequent(exp), env);
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
	    () => isLiteral(exp), () => true,
	    () => isVector(exp), () => true,
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
    if(isSeq(exp)) {
	    const f = first(exp);
	    if(isSymbol(f) && f.value === tag) {
		    return true;
	    } else if(f === tag) {
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
	return isTaggedList(exp, 'def');
}

function definitionVariable(exp) {
	return first(rest(exp));
}

function definitionValue(exp) {
	return first(rest(rest(exp)));
}

function isLambda(exp) {
	return isTaggedList(exp, 'fn');
}

function lambdaParameters(exp) {
	return first(rest(exp));
}

function lambdaBody(exp) {
	return rest(rest(exp));
}

function makeLambda(parameters, body) {
	return seq(cons('fn', seq(list(parameters, body))));
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
		return new LiteralToken('false');
	}
}

function makeIf(predicate, consequent, alternative) {
	return seq(list('if', predicate, consequent, alternative));
}

function isBegin(exp) {
	return isTaggedList(exp, 'do'); //in clojure this is `do`
}

function beginActions(exp) {
	return rest(exp);
}

function isLastExp(seq) {
	return count(rest(seq)) === 0;
}

function firstExp(seq) {
	return first(seq);
}

function restExps(seq) {
	return rest(seq);
}

export function makeBegin(s) {
	return seq(cons('do', s));
}

function isApplication(exp) {
	return isSeq(exp);
}

function operator(exp) {
	return first(exp);
}

function operands(exp) {
	return rest(exp);
}

function isNoOperands(ops) {
	return count(ops) === 0;
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
	return isKeyword(clause) && (clause.value === 'else');
}

function condToIf(exp) {
	return expandClauses(condClauses(exp));
}

function expandClauses(clauses) {
	if(count(clauses) === 0) {
		return new LiteralToken('false');
	} else {
		let predicate = first(clauses);
		let cons = rest(clauses);
		if(isCondElseClause(predicate)) {
			if(count(cons) === 1) {
				return first(cons);
			} else {
				throw new Error('COND->IF: Else clause not last', clauses);
			}
		} else {
			return makeIf(predicate, first(cons), expandClauses(rest(cons)));
		}
	}
}

function makeProcedure(parameters, body, env) {
	return seq(list('procedure', parameters, body, env));
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

const theEmptyEnvironment = {};

function isEmptyFrame(l) {
	return Object.keys(l).length === 0;
}

function makeFrame(variables, values) {
	return reduceKV((prev, key, val) => (prev[key] = val) && prev, {}, zipmap(variables, values));
}

function addBindingToFrame(variable, value, frame) {
	frame[variable] = value;
}

function extendEnvironment(vars, vals, baseEnv) {
	if(count(vars) === count(vals)) {
		return seq(cons(makeFrame(vars, vals), baseEnv));
	} else {
		if(count(vars) < count(vals)) {
			throw new Error('Given little count of arguments', vars, vals);
		} else {
			throw new Error('Given too much arguments', vars, vals);
		}
	}
}

function lookupVariableValue(variable, env) {
	function envLoop(env) {
		function scan(frame) {
			return cond([
				() => isEmptyFrame(frame), () => envLoop(enclosingEnvironment(env)),
				() => frame[variable] !== void 0, () => frame[variable],
				() => true, () => envLoop(enclosingEnvironment(env))
			])
		}
		if(count(env) === 0) { //when env list is empty (when search variable, give rest of env and lookup again)
			throw new Error('Unbound variable ' + variable);
		} else {
			return scan(firstFrame(env));
		}
	}
	return envLoop(env);
}

function setVariableValue(variable, value, env) {
	function envLoop(env) {
		function scan(frame) {
			return cond([
				() => isEmptyFrame(frame), () => envLoop(enclosingEnvironment(env)),
				() => frame[variable.value], () => addBindingToFrame(variable.value, value, frame),
				() => true, () => envLoop(enclosingEnvironment(env))
			])
		}
		if(count(env) === 0) {
			throw new Error('Unbound variable ' + variable);
		} else {
			return scan(firstFrame(env));
		}
	}
	return envLoop(env);
}

function defineVariable(variable, value, env) {
	addBindingToFrame(variable.value, value, firstFrame(env));
}

//

const primitiveProcedures = {
	'car': args => first(args[0]),
	'cdr': args => rest(args[0]),
	'cons': args => List.cons(args[0], args[1]),
	'nil?': args => (isNil(nth(args, 0)) && new LiteralToken('true')) || new LiteralToken('false'),
	'true?': args => (isTrue(nth(args, 0)) && new LiteralToken('true')) || new LiteralToken('false'),
	'false?': args => (isFalse(nth(args, 0)) && new LiteralToken('true')) || new LiteralToken('false'),
	'+': args => reduce((p,c)=>p+c.value, 0, args),
	'-': args => reduce((p,c)=> p.value ? p.value-c.value : p - c.value, args),
	'=': args => ((nth(args, 0).value === nth(args, 1).value) && new LiteralToken('true')) || new LiteralToken('false'),
	'println': args => console.log(args)
};

export function setupEnvironment() {
	return extendEnvironment(primitiveProcedureNames(), primitiveProcedureObjects(), list(theEmptyEnvironment));
}

function isPrimitiveProcedure(proc) {
	return isTaggedList(proc, 'primitive');
}

function primitiveImplementation(proc) {
	return first(rest(proc));
}

export function primitiveProcedureNames() {
	return seq(Object.keys(primitiveProcedures));
}

export function primitiveProcedureObjects() {
	return map(proc => seq(list('primitive', proc)), map(variable => primitiveProcedures[variable], primitiveProcedureNames()));
}

function applyPrimitiveProcedure(proc, args) {
	return primitiveImplementation(proc)(args);
}