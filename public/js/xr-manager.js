// WebXR manager — AR/VR session with hit-test placement

export class XRManager {
  constructor(sceneManager, companion) {
    this.sceneManager = sceneManager;
    this.companion = companion;
    this.session = null;
    this.hitTestSource = null;
    this.placed = false;

    this.xrButton = document.getElementById('xr-button');

    this._init();
  }

  async _init() {
    if (!navigator.xr) return;

    // Check AR first, then VR
    let mode = null;
    try {
      if (await navigator.xr.isSessionSupported('immersive-ar')) {
        mode = 'immersive-ar';
      } else if (await navigator.xr.isSessionSupported('immersive-vr')) {
        mode = 'immersive-vr';
      }
    } catch (e) {
      console.log('[xr] WebXR check failed:', e);
      return;
    }

    if (!mode) return;

    this.mode = mode;
    this.xrButton.textContent = mode === 'immersive-ar' ? 'Enter AR' : 'Enter VR';
    this.xrButton.style.display = 'block';

    this.xrButton.addEventListener('click', () => this._startSession());
  }

  async _startSession() {
    if (this.session) return;

    const features = ['local-floor'];
    const optional = ['dom-overlay', 'hit-test', 'hand-tracking'];

    const options = {
      requiredFeatures: features,
      optionalFeatures: optional
    };

    // DOM overlay keeps the chat panel visible in XR
    if (this.mode === 'immersive-ar') {
      options.domOverlay = { root: document.getElementById('chat-panel') };
    }

    try {
      this.session = await navigator.xr.requestSession(this.mode, options);
    } catch (e) {
      console.error('[xr] session request failed:', e);
      return;
    }

    this.sceneManager.xr.setSession(this.session);
    this.sceneManager.enterAR();

    // Hide companion until placed (AR mode)
    if (this.mode === 'immersive-ar') {
      this.companion.group.visible = false;
      this.placed = false;
      this._setupHitTest();
    }

    this.xrButton.textContent = 'Exit';
    this.xrButton.onclick = () => this.session.end();

    this.session.addEventListener('end', () => {
      this.session = null;
      this.hitTestSource = null;
      this.placed = false;
      this.companion.group.visible = true;
      this.companion.group.position.set(0, 1.2, 0);
      this.sceneManager.exitAR();
      this.xrButton.textContent = this.mode === 'immersive-ar' ? 'Enter AR' : 'Enter VR';
      this.xrButton.onclick = () => this._startSession();
    });

    // Select = tap to place companion
    this.session.addEventListener('select', () => {
      if (!this.placed && this._lastHitPose) {
        const pos = this._lastHitPose.transform.position;
        this.companion.group.position.set(pos.x, pos.y + 0.3, pos.z);
        this.companion.group.visible = true;
        this.placed = true;
      }
    });
  }

  async _setupHitTest() {
    if (!this.session) return;
    try {
      const viewerSpace = await this.session.requestReferenceSpace('viewer');
      this.hitTestSource = await this.session.requestHitTestSource({ space: viewerSpace });
    } catch (e) {
      // Hit test not supported — just show companion at default position
      this.companion.group.visible = true;
      this.companion.group.position.set(0, 0.5, -1.5);
      this.placed = true;
    }
  }

  update(frame) {
    if (!this.session || !this.hitTestSource || this.placed) return;

    const refSpace = this.sceneManager.xr.getReferenceSpace();
    if (!refSpace) return;

    const results = frame.getHitTestResults(this.hitTestSource);
    if (results.length > 0) {
      this._lastHitPose = results[0].getPose(refSpace);
    }
  }
}
