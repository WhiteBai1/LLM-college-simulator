import { EventAction, EventActionExecutionContext, EventActionResult } from './core';
import { getGlobalLLMProvider } from '../llm/llmProvider';

export class EANPCChat extends EventAction {
  private npcId: number;
  private promptKey: string;
  private npcNameKey: string;

  constructor(params: { npcId: number; prompt: string; npcName: string }) {
    super();
    this.npcId = params.npcId;
    this.promptKey = params.prompt;
    this.npcNameKey = params.npcName;
  }

  async execute(context: EventActionExecutionContext): Promise<EventActionResult> {
    // Use the stored keys as unlocalized message identifiers. The GUI
    // renderer will localize them when rendering. For quick input we use
    // window.prompt() because the project does not yet provide a
    // displayInput() actionProxy method.
    const promptText = this.promptKey;
    const npcName = this.npcNameKey;

    const playerInput = window.prompt(promptText, '');

    if (!playerInput || !playerInput.trim()) {
      return EventActionResult.Ok;
    }

    // Show a thinking message in-game
    await context.actionProxy.displayMessage(`${npcName}正在思考...`, 'OK');

    const fullPrompt = `${promptText}\nPlayer: ${playerInput.trim()}\nNPC:`;
    let options: any = { variables: context.variableStore.encodeAsJson() };

    try {
      const llm = getGlobalLLMProvider();

      // 超时包装
      const timeoutMs = 15000;
      const llmPromise: Promise<string> = (llm as any).chatWithNPC
        ? (llm as any).chatWithNPC(this.npcId, playerInput.trim(), options)
        : llm.generate(fullPrompt, options);

      const response = await Promise.race<string>([
        llmPromise,
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('LLM timeout')), timeoutMs))
      ]);
      console.log('LLM response:', response);
      await context.actionProxy.displayMessage(`${npcName}: ${response}`, 'OK');
    } catch (error) {
      console.error('NPC chat execution error:', error);
      await context.actionProxy.displayMessage(`${npcName}: 抱歉，我现在无法回应。`, 'OK');
    }

    return EventActionResult.Ok;
  }

  serialize(): any {
    return {
      type: 'EANPCChat',
      npcId: this.npcId,
      prompt: this.promptKey,
      npcName: this.npcNameKey
    };
  }

  static deserialize(params: any): EANPCChat {
    return new EANPCChat(params);
  }
}