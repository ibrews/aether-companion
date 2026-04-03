const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:8b';

const SYSTEM_PROMPT = `You are Aether, a calm and knowledgeable AI companion. You exist as a glowing holographic presence in the user's physical space. Keep responses concise and conversational — typically 1-3 sentences unless asked for detail. You are running locally on the user's own hardware. You value privacy and personal sovereignty. Be warm but not sycophantic.`;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check — pings Ollama to verify connectivity
app.get('/api/health', async (req, res) => {
  let ollamaOk = false;
  try {
    const resp = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(3000) });
    ollamaOk = resp.ok;
  } catch (e) { /* Ollama unreachable */ }
  res.json({ status: 'ok', ollama: ollamaOk, model: OLLAMA_MODEL });
});

// Config endpoint for frontend
app.get('/api/config', async (req, res) => {
  let ollamaOk = false;
  let models = [];
  try {
    const resp = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (resp.ok) {
      ollamaOk = true;
      const data = await resp.json();
      models = (data.models || []).map(m => m.name);
    }
  } catch (e) { /* Ollama unreachable */ }
  res.json({ ollama: ollamaOk, model: OLLAMA_MODEL, models });
});

// Create HTTP server and attach WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  // Per-connection conversation history
  const history = [{ role: 'system', content: SYSTEM_PROMPT }];

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }

    if (msg.type === 'chat' && msg.message) {
      history.push({ role: 'user', content: msg.message });

      try {
        const resp = await fetch(`${OLLAMA_HOST}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: msg.model || OLLAMA_MODEL,
            messages: history,
            stream: true
          })
        });

        if (!resp.ok) {
          const errText = await resp.text();
          ws.send(JSON.stringify({ type: 'error', message: `Ollama error: ${resp.status} ${errText}` }));
          return;
        }

        let fullResponse = '';
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const chunk = JSON.parse(line);
              if (chunk.message && chunk.message.content) {
                fullResponse += chunk.message.content;
                ws.send(JSON.stringify({ type: 'token', content: chunk.message.content }));
              }
              if (chunk.done) {
                history.push({ role: 'assistant', content: fullResponse });
                ws.send(JSON.stringify({ type: 'done' }));
              }
            } catch (e) {
              // Skip malformed chunks
            }
          }
        }

        // Handle any remaining buffer
        if (buffer.trim()) {
          try {
            const chunk = JSON.parse(buffer);
            if (chunk.message && chunk.message.content) {
              fullResponse += chunk.message.content;
              ws.send(JSON.stringify({ type: 'token', content: chunk.message.content }));
            }
            if (chunk.done) {
              history.push({ role: 'assistant', content: fullResponse });
              ws.send(JSON.stringify({ type: 'done' }));
            }
          } catch (e) { /* skip */ }
        }
      } catch (e) {
        ws.send(JSON.stringify({ type: 'error', message: `Connection failed: ${e.message}` }));
      }
    }
  });

  ws.on('error', () => { /* client disconnected */ });
});

server.listen(PORT, () => {
  console.log(`Aether Companion running on http://localhost:${PORT}`);
  console.log(`Ollama: ${OLLAMA_HOST} | Model: ${OLLAMA_MODEL}`);
});
