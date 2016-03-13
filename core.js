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
	nth
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
	return isSymbol(first(rest(exp))) ? first(rest(exp)) : first(first(rest(exp)));
}

function definitionValue(exp) {
	return isSymbol(first(rest(exp))) ? first(rest(rest(exp))) : makeLambda(rest(first(rest(exp))), rest(rest(exp)));
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
	return seq(list('fn', seq(list((parameters, body)))));
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
	return isTaggedList(exp, 'begin'); //in clojure this is `do`
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

function makeBegin(s) {
	return seq(list('begin', s));
}

function sequenceToExp(seq) {
	return cond([
		() => count(seq) === 0, () => seq,
		() => isLastExp(seq), () => firstExp(seq),
		() => true, () => makeBegin(seq)
	]);
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

const theEmptyEnvironment = list();

function isEmptyList(l) {
	return count(l) === 0;
}

function makeFrame(variables, values) {
	return seq(list(variables, values));
}

function frameVariables(frame) {
	return first(frame);
}

function frameValues(frame) {
	return first(rest(frame));
}

function addBindingToFrame(variable, value, frame) {
	List.setCar(frame, seq(list(variable, first(frame))));
	List.setCdr(frame, seq(list(value, rest(frame)))); //TODO: check it
}

function extendEnvironment(vars, vals, baseEnv) {
	if(count(vars) === count(vals)) {
		return seq(list(makeFrame(vars, vals), baseEnv));
	} else {
		if(count(vars) < count(vals)) {
			throw new Error('Given little count of arguments', vars, vals);
		} else {
			throw new Error('Given too much arguments', vars, vals);
		}
	}
}

function lookupVariableValue(variable, env) {
	variable = variable.value;
	function envLoop(env) {
		function scan(vars, vals) {
			return cond([
				() => isEmptyList(vars), () => envLoop(enclosingEnvironment(env)),
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

const primitiveProcedures = seq(list(
	seq(list('car', args => first(args[0]))),
	seq(list('cdr', args => rest(args[0]))),
	seq(list('cons', args => List.cons(args[0], args[1]))),
	seq(list('nil?', args => (isNil(nth(args, 0)) && new LiteralToken('true')) || new LiteralToken('false'))),
	seq(list('true?', args => (isTrue(nth(args, 0)) && new LiteralToken('true')) || new LiteralToken('false'))),
	seq(list('false?', args => (isFalse(nth(args, 0)) && new LiteralToken('true')) || new LiteralToken('false'))),
	seq(list('+', args => args.reduce((p,c)=>p+c, 0))),
	seq(list('-', args => args.reduce((p,c)=>p-c))),
	seq(list('=', args => ((nth(args, 0).value === nth(args, 1).value) && new LiteralToken('true')) || new LiteralToken('false'))),
	seq(list('printline', args => args[0]))
));

export function setupEnvironment() {
	return extendEnvironment(primitiveProcedureNames(), primitiveProcedureObjects(), theEmptyEnvironment);
}

function isPrimitiveProcedure(proc) {
	return isTaggedList(proc, 'primitive');
}

function primitiveImplementation(proc) {
	return first(rest(proc));
}

export function primitiveProcedureNames() {
	return map(first, primitiveProcedures);
}

export function primitiveProcedureObjects() {
	return map(proc => seq(list('primitive', first(rest(proc)))), primitiveProcedures);
}

function applyPrimitiveProcedure(proc, args) {
	return primitiveImplementation(proc)(args);
}