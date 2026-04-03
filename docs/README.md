# Aether Companion

A spatial AI companion that lives in your physical space. WebXR-powered, fully local, powered by your Ollama models. No cloud, no data leaves your machine.

## What it does

Aether is a glowing holographic AI presence that you can talk to — by voice or text. It runs entirely on your local hardware using Ollama for inference. In WebXR mode (Apple Vision Pro, Meta Quest, or any WebXR-capable browser), the companion appears in your actual room as an interactive particle orb that reacts to conversation.

### Features

- **Spatial presence** — In AR mode, tap to place the companion on any surface in your room
- **Local LLM chat** — Multi-turn conversation via Ollama (llama3.2, mistral, or any model you have)
- **Streaming responses** — Token-by-token streaming with real-time visual feedback
- **Voice input/output** — Speak to Aether using your microphone, hear responses via TTS
- **Reactive avatar** — The orb's color, particles, and pulse change based on conversation state
- **Zero cloud dependency** — Everything runs on your hardware. No data leaves your network.
- **Desktop fallback** — Works beautifully in any modern browser without XR

### Companion States

| State | Visual | Trigger |
|-------|--------|---------|
| Idle | Purple glow, slow orbit | Default |
| Listening | Blue shift, particles accelerate | Mic active |
| Responding | Green pulse, particles scatter | Streaming tokens |
| Error | Red flash, particles contract | Connection lost |

## Requirements

- **Ollama** running on the host machine (port 11434)
- At least one model pulled (e.g., `ollama pull llama3.2`)
- Docker (for containerized deployment)
- A modern browser (Chrome 113+, Safari 17+, Firefox 120+)

## Quick Start

### With Docker (recommended)

```bash
docker-compose up -d
```

Then open `http://localhost:3456` in your browser.

### Without Docker

```bash
npm install
node server.js
```

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3456` | Server port |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `llama3.2` | Default model for inference |

## WebXR Usage

1. Open `http://localhost:3456` on your headset's browser
2. Click "Enter AR" (or "Enter VR" on Quest)
3. Look at a surface and tap to place the companion
4. Chat via the overlay panel or use voice input

### Supported Devices

- **Apple Vision Pro** — Safari WebXR (immersive-ar with passthrough)
- **Meta Quest 2/3/Pro** — Quest Browser (immersive-ar or immersive-vr)
- **Desktop** — Chrome, Firefox, Safari (inline 3D, no XR required)

## Privacy

- All conversation happens locally via Ollama
- No telemetry, no analytics, no external API calls
- Conversation history exists only in RAM during the session — it's discarded when you close the tab
- The Docker container makes no outbound network connections

## Tech Stack

- **Backend:** Node.js (Express) + WebSocket (ws)
- **Frontend:** Three.js (WebGL/WebXR) + vanilla JS
- **AI:** Ollama local inference
- **Voice:** Web Speech API (STT) + SpeechSynthesis (TTS)
- **Container:** Docker (Node 20 Alpine, ~50MB image)

## License

MIT

---

Built by [Agile Lens](https://agilelens.com) for the CI.computer Companion Marketplace.
