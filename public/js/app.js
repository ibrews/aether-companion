// Aether Companion — main bootstrap

import { SceneManager } from './scene.js';
import { Companion } from './companion.js';
import { XRManager } from './xr-manager.js';
import { ChatManager } from './chat.js';
import { SpeechManager } from './speech.js';

async function init() {
  const loadingEl = document.getElementById('loading');

  // 1. Check backend status
  let config = { ollama: false, model: '--', models: [] };
  try {
    const resp = await fetch('/api/config');
    config = await resp.json();
  } catch (e) {
    console.warn('[app] backend unreachable');
  }

  // Update status bar
  const statusDot = document.getElementById('ollama-status');
  const modelName = document.getElementById('model-name');
  statusDot.className = `status-dot ${config.ollama ? 'online' : 'offline'}`;
  modelName.textContent = config.ollama ? config.model : 'Ollama offline';

  // 2. Initialize Three.js scene
  const canvas = document.getElementById('scene-canvas');
  const sceneManager = new SceneManager(canvas);

  // 3. Create companion avatar
  const companion = new Companion(sceneManager.scene);

  // 4. Initialize chat
  const chat = new ChatManager();
  chat.connect();

  chat.onStateChange = (state) => {
    if (state === 'streaming') {
      companion.setState('streaming');
    } else if (state === 'error') {
      companion.setState('error');
    } else {
      companion.setState('idle');
    }
  };

  chat.onToken = () => {
    companion.onToken();
  };

  // 5. Initialize speech
  const speech = new SpeechManager();
  speech.onResult = (transcript) => {
    chat.send(transcript);
  };
  speech.onStateChange = (listening) => {
    if (listening) {
      companion.setState('listening');
    } else if (!chat.isStreaming) {
      companion.setState('idle');
    }
  };

  // 6. Initialize WebXR
  const xrManager = new XRManager(sceneManager, companion);

  // 7. Animation loop
  const clock = sceneManager.clock;

  sceneManager.renderer.setAnimationLoop((timestamp, frame) => {
    const time = clock.getElapsedTime();

    sceneManager.update();
    companion.update(time);

    if (frame) {
      xrManager.update(frame);
    }

    sceneManager.render();
  });

  // 8. Hide loading screen
  setTimeout(() => {
    loadingEl.classList.add('hidden');
    setTimeout(() => loadingEl.remove(), 600);
  }, 800);
}

init().catch(console.error);
