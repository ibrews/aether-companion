// Companion avatar — glowing particle orb with animation states

import * as THREE from '../lib/three.module.js';

const VERTEX_SHADER = `
  uniform float uTime;
  uniform float uActivity;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  // Simplex-like noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    float speed = 0.8 + uActivity * 1.5;
    float amplitude = 0.04 + uActivity * 0.08;
    float noise = snoise(position * 3.0 + uTime * speed);
    float displacement = noise * amplitude;
    vDisplacement = displacement;
    vec3 newPosition = position + normal * displacement;
    // Breathing scale
    float breath = 1.0 + sin(uTime * 1.2) * 0.03 * (1.0 - uActivity * 0.5);
    newPosition *= breath;
    vPosition = newPosition;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uActivity;
  uniform vec3 uColor;
  uniform vec3 uActiveColor;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  void main() {
    // Fresnel glow — brighter at edges
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = 1.0 - max(dot(viewDir, vNormal), 0.0);
    fresnel = pow(fresnel, 2.5);

    // Color blend based on activity
    vec3 color = mix(uColor, uActiveColor, uActivity);

    // Add displacement-based brightness variation
    float bright = 0.6 + vDisplacement * 4.0 + fresnel * 0.8;

    // Pulse on activity
    float pulse = sin(uTime * 8.0) * 0.15 * uActivity;
    bright += pulse;

    // Final color
    vec3 finalColor = color * bright;

    // Alpha: solid at center, glow at edges
    float alpha = 0.85 + fresnel * 0.15;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export class Companion {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.position.set(0, 1.2, 0);
    scene.add(this.group);

    this.activity = 0;       // 0-1, drives animation intensity
    this.targetActivity = 0;
    this.state = 'idle';     // idle, listening, streaming, error
    this.tokenPulse = 0;     // spikes on each token

    this._createCore();
    this._createParticleRing();
    this._createOuterGlow();
  }

  _createCore() {
    const geo = new THREE.IcosahedronGeometry(0.15, 5);
    this.coreMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uActivity: { value: 0 },
        uColor: { value: new THREE.Color(0x6366f1) },
        uActiveColor: { value: new THREE.Color(0x22c55e) }
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true
    });
    this.core = new THREE.Mesh(geo, this.coreMaterial);
    this.group.add(this.core);
  }

  _createParticleRing() {
    const count = 200;
    const positions = new Float32Array(count * 3);
    this.particleAngles = new Float32Array(count);
    this.particleRadii = new Float32Array(count);
    this.particleSpeeds = new Float32Array(count);
    this.particleYOffsets = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.2 + Math.random() * 0.15;
      const y = (Math.random() - 0.5) * 0.2;

      this.particleAngles[i] = angle;
      this.particleRadii[i] = radius;
      this.particleSpeeds[i] = 0.3 + Math.random() * 0.7;
      this.particleYOffsets[i] = y;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.particleMaterial = new THREE.PointsMaterial({
      color: 0x6366f1,
      size: 0.012,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geo, this.particleMaterial);
    this.group.add(this.particles);
  }

  _createOuterGlow() {
    const geo = new THREE.SphereGeometry(0.28, 32, 32);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x6366f1) },
        uOpacity: { value: 0.15 }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uTime;
        varying vec3 vNormal;
        void main() {
          float fresnel = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
          float pulse = 1.0 + sin(uTime * 1.5) * 0.1;
          gl_FragColor = vec4(uColor, fresnel * uOpacity * pulse);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.glow = new THREE.Mesh(geo, mat);
    this.group.add(this.glow);
    this.glowMaterial = mat;
  }

  setState(state) {
    this.state = state;
    const colors = {
      idle:      { core: 0x6366f1, active: 0x6366f1, activity: 0 },
      listening: { core: 0x6366f1, active: 0x3b82f6, activity: 0.4 },
      streaming: { core: 0x6366f1, active: 0x22c55e, activity: 0.8 },
      error:     { core: 0xef4444, active: 0xef4444, activity: 1.0 }
    };

    const c = colors[state] || colors.idle;
    this.coreMaterial.uniforms.uColor.value.setHex(c.core);
    this.coreMaterial.uniforms.uActiveColor.value.setHex(c.active);
    this.glowMaterial.uniforms.uColor.value.setHex(c.active);
    this.particleMaterial.color.setHex(c.active);
    this.targetActivity = c.activity;
  }

  onToken() {
    this.tokenPulse = 1.0;
  }

  update(time) {
    // Smooth activity transitions
    this.activity += (this.targetActivity - this.activity) * 0.05;
    this.tokenPulse *= 0.9; // decay

    const effectiveActivity = Math.min(this.activity + this.tokenPulse * 0.3, 1.0);

    // Update shader uniforms
    this.coreMaterial.uniforms.uTime.value = time;
    this.coreMaterial.uniforms.uActivity.value = effectiveActivity;
    this.glowMaterial.uniforms.uTime.value = time;
    this.glowMaterial.uniforms.uOpacity.value = 0.15 + effectiveActivity * 0.15;

    // Rotate core slowly
    this.core.rotation.y = time * 0.15;
    this.core.rotation.x = Math.sin(time * 0.1) * 0.1;

    // Animate particle orbits
    const positions = this.particles.geometry.attributes.position.array;
    const speed = 1 + effectiveActivity * 3;
    const spread = 1 + effectiveActivity * 0.5;

    for (let i = 0; i < this.particleAngles.length; i++) {
      this.particleAngles[i] += this.particleSpeeds[i] * speed * 0.005;
      const angle = this.particleAngles[i];
      const radius = this.particleRadii[i] * spread;
      const yWobble = Math.sin(time * 2 + i * 0.5) * 0.02 * (1 + effectiveActivity);

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = this.particleYOffsets[i] + yWobble;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;

    // Glow scale pulses with activity
    const glowScale = 1 + effectiveActivity * 0.3 + Math.sin(time * 2) * 0.05;
    this.glow.scale.setScalar(glowScale);

    // Gentle float
    this.group.position.y = 1.2 + Math.sin(time * 0.8) * 0.03;
  }
}
