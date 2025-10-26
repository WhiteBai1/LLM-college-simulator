import { EventAction, EventActionExecutionContext, EventActionResult } from '../event/core';
import { CompiledEventExpression } from '../event/expression';
import { TranslationKeySource } from '../event/translationKeySource';

/**
 * Minimal example action implementation.
 * Put this file under `src/examples/` or `src/event/` and register it in
 * `GameEngine._initFactories()` with:
 *    this._actionFactory.registerDeserializer(EAMyAction);
 */
export class EAMyAction extends EventAction {

    static ID = 'MyAction';

    constructor(private _message: TranslationKeySource,
                private _setVarExpr?: CompiledEventExpression,
                private _confirmText: string = 'OK') {
        super();
    }

    static fromJSONObject(obj: any, context: any): EAMyAction {
        if (obj['message'] == undefined) throw new Error('message missing');
        const message = context.translationKeySourceFactory.fromObject(obj['message']);
        let setVarExpr: CompiledEventExpression | undefined = undefined;
        if (obj['setVariable'] != undefined) {
            setVarExpr = context.expressionCompiler.compile(obj['setVariable']);
        }
        return new EAMyAction(message, setVarExpr, obj['confirm'] || 'OK');
    }

    execute(context: EventActionExecutionContext): EventActionResult | Promise<EventActionResult> {
        return context.actionProxy.displayMessage(
            this._message.getTranslationKey(context),
            this._confirmText
        ).then(() => {
            if (this._setVarExpr) {
                const newValue = context.evaluator.eval(this._setVarExpr);
                context.variableStore.setVar('lastExprResult', Number(newValue));
            }
            return EventActionResult.Ok;
        });
    }

    collectTranslationKeys(): ReadonlySet<string> {
        return this._message.collectTranslationKeys();
    }

}
