// src/llm/langchain/npcSystem.ts
interface NPC {
  id: number;
  name: string;
  age: number;
  gender: string;
  occupation: string;
  personality: string;
  likes: string[];
  dislikes: string[];
}

class SimpleMemory {
  private messages: Array<{ type: 'human' | 'ai', content: string }> = [];
  private maxMessages: number;
  
  constructor(maxMessages: number = 5) {
    this.maxMessages = maxMessages;
  }
  
  getMessages(): string {
    // 限制消息数量
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }
    
    return this.messages.map(msg => 
      `${msg.type === 'human' ? '玩家' : 'NPC'}: ${msg.content}`
    ).join('\n');
  }
  
  addMessage(input: string, response: string) {
    this.messages.push({ type: 'human', content: input });
    this.messages.push({ type: 'ai', content: response });
  }
}

class NPCSystem {
  private npcs: NPC[];
  private memory: Map<number, SimpleMemory>;

  constructor() {
    this.npcs = [
      {
        id: 1,
        name: "林教授",
        age: 45,
        gender: "男",
        occupation: "大学教授",
        personality: "严谨、耐心、知识渊博",
        likes: ["学术讨论", "历史", "科学"],
        dislikes: ["肤浅的聊天", "浪费时间"],
      },
      {
        id: 2,
        name: "小王",
        age: 20,
        gender: "男",
        occupation: "学生",
        personality: "活泼、好奇、有点害羞",
        likes: ["游戏", "音乐", "运动"],
        dislikes: ["考试", "早起"],
      }
    ];
    this.memory = new Map();
  }

  getNPC(npcId: number): NPC | undefined {
    return this.npcs.find(npc => npc.id === npcId);
  }

  getMemory(npcId: number): SimpleMemory {
    if (!this.memory.has(npcId)) {
      this.memory.set(npcId, new SimpleMemory(5));
    }
    return this.memory.get(npcId)!;
  }

  // 添加NPC的方法
  addNPC(npc: NPC) {
    this.npcs.push(npc);
  }
}

export { NPCSystem, SimpleMemory };
export type { NPC };