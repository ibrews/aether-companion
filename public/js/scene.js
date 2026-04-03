// Three.js scene setup — camera, lighting, environment

import * as THREE from '../lib/three.module.js';

export class SceneManager {
  constructor(canvas) {
    this.scene = new THREE.Scene();

    // Camera at eye height for desktop
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100);
    this.camera.position.set(0, 1.4, 2.5);
    this.camera.lookAt(0, 1.2, 0);

    // Renderer with alpha for AR passthrough
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.xr.enabled = true;

    // Dark background for desktop (removed in AR)
    this.scene.background = new THREE.Color(0x0a0b10);

    // Lighting
    const ambient = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(ambient);

    this.keyLight = new THREE.PointLight(0x6366f1, 3, 15);
    this.keyLight.position.set(0, 2.5, 2);
    this.scene.add(this.keyLight);

    const fillLight = new THREE.PointLight(0x3b82f6, 1, 10);
    fillLight.position.set(-2, 1, -1);
    this.scene.add(fillLight);

    // Ground — subtle reflective disc
    this._createGround();

    // Floating particles in background
    this._createAmbientParticles();

    // Handle resize
    window.addEventListener('resize', () => this.onResize());

    // Simple mouse orbit for desktop
    this._setupMouseOrbit();

    this.clock = new THREE.Clock();
  }

  _createGround() {
    const geo = new THREE.CircleGeometry(6, 64);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0f1118,
      roughness: 0.6,
      metalness: 0.2,
      transparent: true,
      opacity: 0.8
    });
    this.ground = new THREE.Mesh(geo, mat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // Subtle grid ring
    const ringGeo = new THREE.RingGeometry(1.5, 1.52, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.001;
    this.scene.add(ring);
  }

  _createAmbientParticles() {
    const count = 80;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = Math.random() * 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x6366f1,
      size: 0.02,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.ambientParticles = new THREE.Points(geo, mat);
    this.scene.add(this.ambientParticles);
  }

  _setupMouseOrbit() {
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetCamX = 0;
    this.targetCamY = 1.4;

    window.addEventListener('mousemove', (e) => {
      this.mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });
  }

  enterAR() {
    this.scene.background = null;
    if (this.ground) this.ground.visible = false;
    if (this.ambientParticles) this.ambientParticles.visible = false;
  }

  exitAR() {
    this.scene.background = new THREE.Color(0x0a0b10);
    if (this.ground) this.ground.visible = true;
    if (this.ambientParticles) this.ambientParticles.visible = true;
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  update() {
    const t = this.clock.getElapsedTime();

    // Gentle camera sway from mouse (desktop only, not in XR)
    if (!this.renderer.xr.isPresenting) {
      this.targetCamX = this.mouseX * 0.5;
      this.targetCamY = 1.4 - this.mouseY * 0.2;
      this.camera.position.x += (this.targetCamX - this.camera.position.x) * 0.02;
      this.camera.position.y += (this.targetCamY - this.camera.position.y) * 0.02;
      this.camera.lookAt(0, 1.2, 0);
    }

    // Animate ambient particles — slow drift
    if (this.ambientParticles) {
      const positions = this.ambientParticles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(t * 0.3 + i) * 0.0003;
      }
      this.ambientParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Pulse the key light subtly
    this.keyLight.intensity = 3 + Math.sin(t * 0.5) * 0.5;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  get domElement() {
    return this.renderer.domElement;
  }

  get xr() {
    return this.renderer.xr;
  }
}
