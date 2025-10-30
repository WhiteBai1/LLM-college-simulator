import { NPCSystem } from "./langchain/npcSystem";
import { ChatSystem } from "./langchain/chatSystem";

export interface ILLMProvider {
  generate(prompt: string, context?: any): Promise<string>;
  chatWithNPC(
    npcId: number,
    playerInput: string,
    gameContext?: any
  ): Promise<string>;
}

export class MockLLMProvider implements ILLMProvider {
  async generate(prompt: string, context?: any): Promise<string> {
    return `Mock response for: ${prompt}`;
  }

  async chatWithNPC(
    npcId: number,
    playerInput: string,
    gameContext?: any
  ): Promise<string> {
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
    //  for common llm, use easy prompt
    return `Response: ${prompt}`;
  }

  // key：must call the return of chain.invoke(...) result，and handle memory's savement and mistake log
  async chatWithNPC(
    npcId: number,
    playerInput: string,
    gameContext?: any
  ): Promise<string> {
    try {
      const npc = this.npcSystem.getNPC(npcId);
      if (!npc) {
        throw new Error(`NPC with id ${npcId} not found`);
      }

      const memory = this.npcSystem.getMemory(npcId);
      const chain = this.chatSystem.createChatChain(npc, memory);

      // call chain.invoke and wait the result
      const response = await chain.invoke({
        player_input: playerInput,
      });

      // if memory exist，save the conversation history
      try {
        if (memory && typeof memory.addMessage === "function") {
          await memory.addMessage(playerInput, response);
        }
      } catch (memErr) {
        console.warn("Failed to save NPC memory:", memErr);
      }

      return response;
    } catch (error) {
      console.error("LangChainLLMProvider chatWithNPC error:", error);
      return `抱歉，我现在无法回应。`;
    }
  }
}

// Global LLM Provider Management
let globalLLMProvider: ILLMProvider = new LangChainLLMProvider();

export function getGlobalLLMProvider(): ILLMProvider {
  return globalLLMProvider;
}

export function setGlobalLLMProvider(provider: ILLMProvider): void {
  globalLLMProvider = provider;
}
