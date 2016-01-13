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

function isPair(pair) {
    return pair.toString() === '[cons]';
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
        () => isQouted(exp), () => textOfQutation(exp),
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

function apply(procedure, arguments) {
    cond([
        () => isPrimitiveProcedure(procedure), () => applyPrimitiveProcedure(procedure, arguments),
        () => isCompoundProcedure(procedure), () => evalSequence(
                                                        procedureBody(procedure),
                                                        extendEnvironment(
                                                            procedureParameters(procedure),
                                                            arguments,
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

function isTrue(cond) {
    return !!cond;
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
    return cdr(car(exp));
}

function isTaggedList(exp, tag) {
    if(isPair(exp)) {
        if(car(exp) === tag) {
            return true;
        }
    }
    return false;
}