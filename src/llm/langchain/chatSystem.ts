import { NPC } from "./npcSystem";
import { SimpleMemory } from "./npcSystem";

class ChatSystem {
  private apiUrl: string;

  constructor(apiUrl: string = '/api/llm/chat') {
    this.apiUrl = apiUrl;
  }

  createChatChain(npc: NPC, memory: SimpleMemory) {
    return {
      invoke: async (data: { player_input: string }) => {
        const chatHistory = memory ? memory.getMessages() : '';

        const messages = [
          {
            role: 'system',
            content: `你是 ${npc.name}，${npc.occupation}，性格：${npc.personality}。`
          },
          ...(chatHistory ? [{ role: 'assistant', content: chatHistory }] : []),
          { role: 'user', content: data.player_input }
        ];

        // 调试日志：确保这里会被打印（前端控制台）
        console.log('[ChatSystem] invoking /api/llm/chat', {
          apiUrl: this.apiUrl,
          npcId: npc.id,
          player_input: data.player_input,
          messagesPreview: messages.slice(0, 3)
        });

        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            npc: npc,
            playerInput: data.player_input,
            chatHistory: chatHistory,
            messages: messages
          })
        });

        // 调试日志：检查 HTTP 状态
        console.log('[ChatSystem] fetch completed, status=', response.status);

        if (!response.ok) {
          const text = await response.text().catch(() => '<no body>');
          throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
        }

        const result = await response.json();

        // 兼容后端返回格式
        if (typeof result === 'string') return result;
        if (result.text) return result.text;
        if (Array.isArray(result) && result[0] && result[0].text) return result[0].text;
        if (result.choices && result.choices[0]) {
          const msg = result.choices[0].message;
          if (msg && msg.content) return msg.content;
          if (result.choices[0].text) return result.choices[0].text;
        }

        throw new Error('Unexpected chat API response format');
      }
    };
  }
}

export { ChatSystem };