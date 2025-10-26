import { EventAction, EventActionExecutionContext, EventActionResult } from '../event/core';
import { TranslationKeySource } from '../event/translationKeySource';
import { CompiledEventExpression } from '../event/expression';
import { getGlobalLLMProvider } from '../llm/llmProvider';

/**
 * Example action: ask player for input (via window.prompt), send to LLM,
 * and display the LLM reply. Minimal and synchronous-looking via Promises.
 *
 * JSON schema example:
 * {
 *   "id": "AskLLM",
 *   "prompt": "events.ask_llm_prompt",   // translation key or template
 *   "confirm": "OK"
 * }
 */
export class EAAskLLM extends EventAction {

    static ID = 'AskLLM';

    constructor(private _promptTemplate: TranslationKeySource,
                private _confirm: string = 'OK',
                private _options?: CompiledEventExpression) {
        super();
    }

    static fromJSONObject(obj: any, context: any): EAAskLLM {
        if (obj['prompt'] == undefined) throw new Error('prompt missing');
        const prompt = context.translationKeySourceFactory.fromObject(obj['prompt']);
        let optionsExpr: CompiledEventExpression | undefined;
        if (obj['options'] != undefined) {
            optionsExpr = context.expressionCompiler.compile(obj['options']);
        }
        return new EAAskLLM(prompt, obj['confirm'] || 'OK', optionsExpr);
    }

    async execute(context: EventActionExecutionContext): Promise<EventActionResult> {
        // Build the prompt to show to the user (localized text may contain hints)
        const promptText = this._promptTemplate.getTranslationKey(context);
        // Collect player input. For a quick integration we use window.prompt().
        // For production prefer a nicer in-game UI (see GuiMessageWindow or add an input field).
        const playerInput = window.prompt(promptText, '');
        if (playerInput == null) {
            // Player cancelled.
            return EventActionResult.Ok;
        }

        // Build LLM prompt combining template + player response.
        const fullPrompt = `${promptText}\nPlayer: ${playerInput}\nAssistant:`;

        // Optional options object evaluated from expression if provided.
        let options: Record<string, any> | undefined = undefined;
        if (this._options) {
            options = { evalResult: context.evaluator.eval(this._options) } as any;
        }

        try {
            const provider = getGlobalLLMProvider();
            const reply = await provider.generate(fullPrompt, options);
            // Display reply using normal game message pipeline.
            await context.actionProxy.displayMessage(reply, this._confirm);
            return EventActionResult.Ok;
        } catch (err) {
            console.error('LLM call failed', err);
            await context.actionProxy.displayMessage('LLM request failed.', this._confirm);
            return EventActionResult.Ok;
        }
    }

    collectTranslationKeys(): ReadonlySet<string> {
        return this._promptTemplate.collectTranslationKeys();
    }

}
