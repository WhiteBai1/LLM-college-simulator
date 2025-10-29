require('dotenv').config();  // <-- 新增：加载 .env 到 process.env
const path = require('path');
const fetch = require('node-fetch');
const express = require('express');

const PORT = process.env.PORT || 8000;
const app = express();
app.use(express.static('./docs'));

app.listen(PORT, () => {
  console.log(`Server started on port ${
      PORT}.\nPlease navigate to http://localhost:${PORT} in your browser.`);
});

app.post('/api/llm/chat', express.json(), async (req, res) => {
  try {
    const bodyPreview = JSON.stringify(req.body || {}).slice(0, 2000);
    console.log('Received /api/llm/chat body:', bodyPreview);

    const {npc, playerInput, chatHistory, messages} = req.body || {};

    const safeNpc = npc || {};
    const likes = Array.isArray(safeNpc.likes) ? safeNpc.likes.join(', ') : '';
    const dislikes =
        Array.isArray(safeNpc.dislikes) ? safeNpc.dislikes.join(', ') : '';
    const systemContent = `你是 ${safeNpc.name || 'NPC'}，性格：${
        safeNpc.personality ||
        ''}，年龄：${safeNpc.age || ''}，职业：${safeNpc.occupation || ''}。
喜欢的主题：${likes}
讨厌的话题：${dislikes}

对话历史：${chatHistory || ''}

请根据玩家输入进行合理回复。`;


    const messagesToSend =
        Array.isArray(messages) && messages.length > 0 ? messages : [
          {role: 'system', content: systemContent},
          ...(chatHistory ? [{role: 'assistant', content: chatHistory}] : []),
          {role: 'user', content: playerInput || ''}
        ];

    const LLM_API_URL = process.env.LLM_API_URL || process.env.LLM_URL || '';
    const API_KEY = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '';

    // 调试：打印将要使用的 URL 与 API_KEY 掩码（不要把完整 key 打到日志）
    console.log('Using LLM_API_URL:', LLM_API_URL);
    if (API_KEY)
      console.log(
          'Using API_KEY mask:',
          `${API_KEY.slice(0, 6)}...${API_KEY.slice(-6)}`);

    if (!LLM_API_URL || !API_KEY) {
      console.warn(
          'LLM_API_URL or API_KEY missing — returning mock response for local debug.');
      return res.json({text: `（本地模拟回复）${playerInput || '你好'}`});
    }

    // 允许通过环境控制最大 tokens
    const maxTokens = Number(process.env.LLM_MAX_TOKENS || 800);

    const payload = {
      model: process.env.LLM_MODEL || 'gpt-3.5-turbo',
      messages: messagesToSend,
      temperature: 0.7,
      max_tokens: maxTokens,
      n: 1
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
      return res.status(502).json(
          {error: 'LLM provider error', status: fetchResp.status, body: text});
    }

    const data = await fetchResp.json();
    console.log('LLM provider response keys:', Object.keys(data || {}));

    // 更稳健的回复抽取器（兼容多种 provider 返回格式）
    function extractReply(d) {
      if (!d) return null;
      if (typeof d === 'string' && d.trim()) return d;
      if (typeof d.text === 'string' && d.text.trim()) return d.text;
      if (Array.isArray(d) && typeof d[0] === 'string' && d[0].trim())
        return d[0];

      // OpenAI-like choices
      if (Array.isArray(d.choices) && d.choices.length > 0) {
        const ch = d.choices[0];
        // message.content (chat completion)
        if (ch.message) {
          // message may be string or object
          const msg = ch.message;
          if (typeof msg === 'string' && msg.trim()) return msg;
          if (typeof msg.content === 'string' && msg.content.trim())
            return msg.content;
          // some providers return parts array or content object
          if (Array.isArray(msg.content?.parts) &&
              msg.content.parts.length > 0) {
            return msg.content.parts.join('');
          }
          if (typeof msg.content === 'object') {
            // try common fields
            if (typeof msg.content.text === 'string' && msg.content.text.trim())
              return msg.content.text;
            if (typeof msg.content[0] === 'string' && msg.content[0].trim())
              return msg.content[0];
          }
        }
        // choice.text (completion style)
        if (typeof ch.text === 'string' && ch.text.trim()) return ch.text;
        if (typeof ch.content === 'string' && ch.content.trim())
          return ch.content;
        // some providers embed output in annotations or output/result fields
      }

      // Anthropic / other style outputs
      if (Array.isArray(d.output) && d.output[0] && d.output[0].content) {
        const c = d.output[0].content;
        if (typeof c === 'string' && c.trim()) return c;
        if (Array.isArray(c) && typeof c[0] === 'string') return c.join('');
        if (typeof c === 'object' && typeof c.text === 'string') return c.text;
      }
      if (d.result?.output?.[0]?.content) {
        const c = d.result.output[0].content;
        if (typeof c === 'string' && c.trim()) return c;
        if (Array.isArray(c) && typeof c[0] === 'string') return c.join('');
      }

      return null;
    }

    const replyText = extractReply(data);

    // 如果回复为空且模型 finish_reason 为 length，记录并提示
    const finishReason = data?.choices?.[0]?.finish_reason ||
        data?.choices?.[0]?.message?.finish_reason || null;
    if (!replyText) {
      console.error(
          'Unexpected LLM response format. Full response (truncated):',
          JSON.stringify(data).slice(0, 2000));
      if (finishReason === 'length') {
        return res.status(502).json({
          error:
              'Unexpected response format from LLM (reply empty). Model finish_reason=length (truncated). Try increasing LLM_MAX_TOKENS.',
          data
        });
      }
      return res.status(502).json(
          {error: 'Unexpected response format from LLM', data});
    }

    return res.json({text: replyText});
  } catch (err) {
    console.error('Error in /api/llm/chat:', err);
    return res.status(500).json({error: 'Internal server error'});
  }
});