import { NPCSystem } from "./langchain/npcSystem";
import { ChatSystem } from "./langchain/chatSystem";

export interface ILLMProvider {
  generate(prompt: string, context?: any): Promise<string>;
  chatWithNPC(npcId: number, playerInput: string, gameContext?: any): Promise<string>;
}

export class MockLLMProvider implements ILLMProvider {
  async generate(prompt: string, context?: any): Promise<string> {
    return `Mock response for: ${prompt}`;
  }

  async chatWithNPC(npcId: number, playerInput: string, gameContext?: any): Promise<string> {
    return `Mock NPC response to: ${playerInput}`;
  }
}

export class LangChainLLMProvider implements ILLMProvider {
  private npcSystem: NPCSystem;
  private chatSystem: ChatSystem;

  constructor() {
    this.npcSystem = new NPCSystem();
    this.chatSystem = new ChatSystem();
  }

  async generate(prompt: string, context?: any): Promise<string> {
    // 对于普通的LLM生成，使用简单的提示
    return `Response: ${prompt}`;
  }

  // 关键：务必调用并返回 chain.invoke(...) 的结果，并处理 memory 的保存与错误日志
  async chatWithNPC(npcId: number, playerInput: string, gameContext?: any): Promise<string> {
    try {
      const npc = this.npcSystem.getNPC(npcId);
      if (!npc) {
        throw new Error(`NPC with id ${npcId} not found`);
      }

      const memory = this.npcSystem.getMemory(npcId);
      const chain = this.chatSystem.createChatChain(npc, memory);

      // 调用 chain.invoke 并等待结果
      const response = await chain.invoke({
        player_input: playerInput
      });

      // 如果 memory 存在，保存对话历史
      try {
        if (memory && typeof memory.addMessage === 'function') {
          await memory.addMessage(playerInput, response);
        }
      } catch (memErr) {
        // 内部记忆保存失败不应阻塞主流程，但记录日志
        console.warn('Failed to save NPC memory:', memErr);
      }

      return response;
    } catch (error) {
      console.error('LangChainLLMProvider chatWithNPC error:', error);
      // 返回一个用户可见的错误消息（也可以抛出以由调用端处理）
      return `抱歉，我现在无法回应。`;
    }
  }
}

// 全局LLM提供者管理
let globalLLMProvider: ILLMProvider = new LangChainLLMProvider();

export function getGlobalLLMProvider(): ILLMProvider {
  return globalLLMProvider;
}

export function setGlobalLLMProvider(provider: ILLMProvider): void {
  globalLLMProvider = provider;
}