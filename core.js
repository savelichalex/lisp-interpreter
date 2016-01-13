function cond(arr) {
    let length = arr.length;
    for(let i = 0; i < length, i++) {
        if(arr[i]()) {
            arr[++i]();
            break;
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
        () => true, () => throw new Error('Eval: Unknown expression', exp)
    ]);
}