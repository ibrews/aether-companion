// Speech — Web Speech API for STT input and TTS output

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export class SpeechManager {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.hasFired = false;      // prevent duplicate sends per session
    this.onResult = null;       // callback: (transcript) => {}
    this.onStateChange = null;  // callback: (listening: boolean) => {}
    this.supported = !!SpeechRecognition;

    this.micBtn = document.getElementById('mic-btn');
    this.micBtn.addEventListener('click', () => this.toggle());

    if (!this.supported) {
      this.micBtn.style.opacity = '0.3';
      this.micBtn.title = 'Speech not supported (requires HTTPS)';
    }
  }

  toggle() {
    if (!this.supported) return;
    if (this.isListening) {
      this.stop();
    } else {
      this.start();
    }
  }

  start() {
    if (!this.supported || this.isListening) return;

    this.hasFired = false;
    this.recognition = new SpeechRecognition();
    this.recognition.interimResults = false;
    this.recognition.continuous = false;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event) => {
      // Guard: only send once per recognition session
      if (this.hasFired) return;
      const last = event.results.length - 1;
      if (!event.results[last].isFinal) return;
      this.hasFired = true;
      const transcript = event.results[last][0].transcript.trim();
      if (transcript && this.onResult) this.onResult(transcript);
      this.stop();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.micBtn.classList.remove('active');
      if (this.onStateChange) this.onStateChange(false);
    };

    this.recognition.onerror = (e) => {
      console.warn('[speech] error:', e.error);
      this.isListening = false;
      this.micBtn.classList.remove('active');
      if (this.onStateChange) this.onStateChange(false);
    };

    this.recognition.start();
    this.isListening = true;
    this.micBtn.classList.add('active');
    if (this.onStateChange) this.onStateChange(true);
  }

  stop() {
    if (this.recognition) {
      this.recognition.stop();
    }
    this.isListening = false;
    this.micBtn.classList.remove('active');
    if (this.onStateChange) this.onStateChange(false);
  }

  speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Google')
    );
    if (preferred) utterance.voice = preferred;
    speechSynthesis.speak(utterance);
  }
}
