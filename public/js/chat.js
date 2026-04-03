// Chat manager — WebSocket client for streaming Ollama responses

export class ChatManager {
  constructor() {
    this.ws = null;
    this.currentResponse = '';
    this.currentBubble = null;
    this.isStreaming = false;
    this.onStateChange = null; // callback: (state) => {} where state = 'idle'|'streaming'|'error'
    this.onToken = null;       // callback: (token) => {} for companion animation
    this.reconnectDelay = 2000;
    this.reconnectTimer = null;

    this.messagesEl = document.getElementById('chat-messages');
    this.inputEl = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('send-btn');

    this.sendBtn.addEventListener('click', () => this.sendFromInput());
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendFromInput();
      }
    });
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${location.host}`);

    this.ws.onopen = () => {
      console.log('[chat] connected');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'token':
          if (!this.isStreaming) {
            this.isStreaming = true;
            this._removeDots();
          }
          this.currentResponse += data.content;
          this._updateBubble(this.currentResponse);
          if (this.onToken) this.onToken(data.content);
          break;

        case 'done':
          this.isStreaming = false;
          if (this.onStateChange) this.onStateChange('idle');
          this._scrollToBottom();
          break;

        case 'error':
          this.isStreaming = false;
          this._removeDots();
          this._addMessage('error', data.message || 'Something went wrong');
          if (this.onStateChange) this.onStateChange('error');
          setTimeout(() => {
            if (this.onStateChange) this.onStateChange('idle');
          }, 2000);
          break;
      }
    };

    this.ws.onclose = () => {
      console.log('[chat] disconnected');
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
    };

    this.ws.onerror = () => { /* onclose will fire */ };
  }

  sendFromInput() {
    const text = this.inputEl.value.trim();
    if (!text || this.isStreaming) return;
    this.inputEl.value = '';
    this.send(text);
  }

  send(text) {
    if (!text || this.isStreaming) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this._addMessage('error', 'Not connected');
      return;
    }

    this._addMessage('user', text);
    this.currentResponse = '';
    this.currentBubble = this._addMessage('assistant', '');
    this._addDots(this.currentBubble);

    if (this.onStateChange) this.onStateChange('streaming');

    this.ws.send(JSON.stringify({ type: 'chat', message: text }));
  }

  _addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    const span = document.createElement('span');
    span.className = 'msg-text';
    span.textContent = text;
    div.appendChild(span);
    this.messagesEl.appendChild(div);
    this._scrollToBottom();
    return div;
  }

  _addDots(bubble) {
    const dots = document.createElement('div');
    dots.className = 'typing-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';
    bubble.appendChild(dots);
  }

  _removeDots() {
    if (this.currentBubble) {
      const dots = this.currentBubble.querySelector('.typing-dots');
      if (dots) dots.remove();
    }
  }

  _updateBubble(text) {
    if (!this.currentBubble) return;
    const span = this.currentBubble.querySelector('.msg-text');
    if (span) span.textContent = text;
    this._scrollToBottom();
  }

  _scrollToBottom() {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }
}
