require('dotenv').config(); // <-- 新增：加载 .env 到 process.env
const fetch = require('node-fetch');
const express = require('express');

const PORT = process.env.PORT || 8000;
const app = express();
app.use(express.static('./dist'));

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}.\nPlease navigate to http://localhost:${PORT} in your browser.`);
});

app.post('/api/llm/chat', express.json(), async (req, res) => {
  try {
    const bodyPreview = JSON.stringify(req.body || {}).slice(0, 2000);
    console.log('Received /api/llm/chat body:', bodyPreview);

    const { npc, playerInput, chatHistory, messages } = req.body || {};

    const safeNpc = npc || {};
    const likes = Array.isArray(safeNpc.likes) ? safeNpc.likes.join(', ') : '';
    const dislikes = Array.isArray(safeNpc.dislikes) ? safeNpc.dislikes.join(', ') : '';
    const systemContent = `你是 ${safeNpc.name || 'NPC'}，性格：${safeNpc.personality || ''}，年龄：${safeNpc.age || ''}，职业：${safeNpc.occupation || ''}。
喜欢的主题：${likes}
讨厌的话题：${dislikes}

对话历史：${chatHistory || ''}

请根据玩家输入进行合理回复。`;

    const messagesToSend = Array.isArray(messages) && messages.length > 0
      ? messages
      : [
          { role: 'system', content: systemContent },
          ...(chatHistory ? [{ role: 'assistant', content: chatHistory }] : []),
          { role: 'user', content: playerInput || '' }
        ];

    // 从环境读取真实提供方 URL 与 KEY（方便替换为你从 GitHub 第三方拿到的接口）
    const LLM_API_URL = process.env.LLM_API_URL || process.env.LLM_URL || '';
    const API_KEY = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '';
// 调试：打印将要使用的 URL 与 API_KEY 掩码（不要把完整 key 打到日志）
   console.log('Using LLM_API_URL:', LLM_API_URL);
  if (API_KEY) console.log('Using API_KEY mask:', `${API_KEY.slice(0,6)}...${API_KEY.slice(-6)}`);

    if (!LLM_API_URL || !API_KEY) {
      console.warn('LLM_API_URL or API_KEY missing — returning mock response for local debug.');
      return res.json({ text: `（本地模拟回复）${playerInput || '你好'}` });
    }

    // 支持两种常见协议：chat completions (messages) 或 简单 input 接口
    const payload = {
      model: process.env.LLM_MODEL || 'gpt-3.5-turbo',
      messages: messagesToSend,
      temperature: 0.7,
      max_tokens: 400
    };

    const controller = new AbortController();
    const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 15000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const fetchResp = await fetch(LLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);
    console.log('LLM provider responded status:', fetchResp.status);

    if (!fetchResp.ok) {
      const text = await fetchResp.text().catch(() => '<no body>');
      console.error('LLM HTTP error:', fetchResp.status, text);
      return res.status(502).json({ error: 'LLM provider error', status: fetchResp.status, body: text });
    }

    const data = await fetchResp.json();
    console.log('LLM provider response keys:', Object.keys(data || {}));

    // 解析回复（安全访问，兼容多种格式）
    let reply = null;
    if (typeof data === 'string') reply = data;
    else if (data?.text) reply = data.text;
    else if (Array.isArray(data) && data[0]?.text) reply = data[0].text;
    else if (data?.choices?.[0]?.message?.content) reply = data.choices[0].message.content;
    else if (data?.choices?.[0]?.text) reply = data.choices[0].text;
    else if (data?.output?.[0]?.content) reply = data.output[0].content;
    else if (data?.result?.output?.[0]?.content) reply = data.result.output[0].content;

    if (!reply) {
      console.error('Unexpected LLM response format. Dumping response (truncated):', JSON.stringify(data).slice(0,2000));
      return res.status(502).json({ error: 'Unexpected response format from LLM', data });
    }

    return res.json({ text: reply });
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('LLM request timed out');
      return res.status(504).json({ error: 'LLM request timed out' });
    }
    console.error('Chat API error:', err);
    return res.status(500).json({ error: 'Chat failed', message: String(err) });
  }
});