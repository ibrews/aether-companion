import puppeteer from 'puppeteer';
import { setTimeout } from 'timers/promises';

const SCREENSHOTS_DIR = new URL('../docs/screenshots/', import.meta.url).pathname;
const BASE_URL = 'http://localhost:3456';

const browser = await puppeteer.launch({ headless: 'new' });

// --- Hero shot (desktop, wide) ---
const heroPage = await browser.newPage();
await heroPage.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
await heroPage.goto(BASE_URL, { waitUntil: 'networkidle0' });
await setTimeout(4000); // Let Three.js animations settle
await heroPage.screenshot({ path: `${SCREENSHOTS_DIR}hero.png` });
console.log('hero.png captured');

// --- AR composite (canvas-based: draw room, then overlay orb screenshot) ---
// First capture the orb in transparent mode
const arPage = await browser.newPage();
await arPage.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
await arPage.goto(BASE_URL, { waitUntil: 'networkidle0' });
await setTimeout(4000);
await arPage.evaluate(() => document.getElementById('bg-toggle').click());
await setTimeout(1500);
// Hide all UI — just the orb
await arPage.evaluate(() => {
  document.getElementById('chat-panel').style.display = 'none';
  document.getElementById('status-bar').style.display = 'none';
  document.getElementById('controls-bar').style.display = 'none';
});
await setTimeout(500);
// Grab the orb screenshot as base64
const orbBase64 = await arPage.screenshot({ encoding: 'base64' });
await arPage.close();

// Now create the composite using a standalone canvas page
const compositePage = await browser.newPage();
await compositePage.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
await compositePage.setContent(`<!DOCTYPE html><html><body style="margin:0"><canvas id="c" width="2560" height="1440"></canvas></body></html>`);

await compositePage.evaluate(async (orbB64) => {
  const canvas = document.getElementById('c');
  canvas.style.width = '1280px';
  canvas.style.height = '720px';
  const ctx = canvas.getContext('2d');
  const W = 2560, H = 1440;

  // --- Draw room background (dim, muted — simulates Vision Pro passthrough look) ---
  // Wall
  const wallGrad = ctx.createLinearGradient(0, 0, 0, H);
  wallGrad.addColorStop(0, '#2e2822');
  wallGrad.addColorStop(0.3, '#35302a');
  wallGrad.addColorStop(0.6, '#3d3630');
  wallGrad.addColorStop(0.7, '#3d3630');
  wallGrad.addColorStop(1, '#302a24');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, W, H);

  // Floor
  const floorY = H * 0.68;
  const floorGrad = ctx.createLinearGradient(0, floorY, 0, H);
  floorGrad.addColorStop(0, '#38322c');
  floorGrad.addColorStop(0.4, '#302a24');
  floorGrad.addColorStop(1, '#28221c');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, floorY, W, H - floorY);

  // Floor line
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(W, floorY);
  ctx.stroke();

  // Baseboard
  ctx.fillStyle = '#1e1a15';
  ctx.fillRect(0, floorY - 12, W, 14);

  // Window (left wall) — brighter to provide contrast
  const wx = W * 0.05, wy = H * 0.10, ww = W * 0.13, wh = H * 0.42;
  ctx.fillStyle = 'rgba(160,185,220,0.18)';
  ctx.fillRect(wx, wy, ww, wh);
  ctx.strokeStyle = '#3a352e';
  ctx.lineWidth = 6;
  ctx.strokeRect(wx, wy, ww, wh);
  // Window cross
  ctx.beginPath();
  ctx.moveTo(wx, wy + wh / 2);
  ctx.lineTo(wx + ww, wy + wh / 2);
  ctx.moveTo(wx + ww / 2, wy);
  ctx.lineTo(wx + ww / 2, wy + wh);
  ctx.stroke();
  // Window light spill — warm, visible
  const wlGrad = ctx.createRadialGradient(wx + ww / 2, wy + wh / 2, 0, wx + ww / 2, wy + wh / 2, ww * 2);
  wlGrad.addColorStop(0, 'rgba(255,235,200,0.14)');
  wlGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = wlGrad;
  ctx.fillRect(wx - ww, wy - wh * 0.3, ww * 4, wh * 1.8);

  // Shelf (right wall)
  const sx = W * 0.74, sy = H * 0.30, sw = W * 0.2;
  ctx.fillStyle = '#28231c';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.fillRect(sx, sy, sw, 10);
  ctx.shadowBlur = 0;
  // Plant
  ctx.fillStyle = '#3a4832';
  ctx.fillRect(sx + 30, sy - 70, 50, 70);
  ctx.beginPath();
  ctx.arc(sx + 55, sy - 70, 30, Math.PI, 0);
  ctx.fillStyle = '#45553a';
  ctx.fill();
  // Books
  ctx.fillStyle = '#6a4e3a';
  ctx.fillRect(sx + 120, sy - 55, 30, 55);
  ctx.fillStyle = '#3a4a6a';
  ctx.fillRect(sx + 155, sy - 45, 24, 45);
  ctx.fillStyle = '#6a5a3a';
  ctx.fillRect(sx + 184, sy - 50, 28, 50);

  // Couch / sofa (right side, in front of shelf)
  const couchX = W * 0.68, couchY = floorY - 100;
  ctx.fillStyle = '#2a2520';
  ctx.beginPath();
  ctx.roundRect(couchX, couchY, W * 0.26, 100, 12);
  ctx.fill();
  // Cushions
  ctx.fillStyle = '#32302a';
  ctx.beginPath();
  ctx.roundRect(couchX + 15, couchY + 10, W * 0.12, 55, 8);
  ctx.fill();
  ctx.fillStyle = '#302e28';
  ctx.beginPath();
  ctx.roundRect(couchX + W * 0.12 + 25, couchY + 10, W * 0.12, 55, 8);
  ctx.fill();
  // Armrest
  ctx.fillStyle = '#252018';
  ctx.beginPath();
  ctx.roundRect(couchX - 15, couchY + 5, 20, 90, 6);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(couchX + W * 0.26 - 5, couchY + 5, 20, 90, 6);
  ctx.fill();

  // Desk (left side)
  const dx = 120, dw = 500;
  ctx.fillStyle = '#221e18';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 10;
  ctx.fillRect(dx, floorY - 8, dw, 10);
  ctx.shadowBlur = 0;
  // Desk legs
  ctx.fillRect(dx + 10, floorY, 8, H * 0.18);
  ctx.fillRect(dx + dw - 18, floorY, 8, H * 0.18);

  // Laptop on desk
  ctx.fillStyle = '#151518';
  ctx.strokeStyle = '#2a2a2e';
  ctx.lineWidth = 2;
  const lx = dx + 120, ly = floorY - 85;
  ctx.fillRect(lx, ly, 160, 85);
  ctx.strokeRect(lx, ly, 160, 85);
  // Screen glow
  ctx.fillStyle = '#0e1e30';
  ctx.fillRect(lx + 8, ly + 6, 144, 65);
  // Keyboard base
  ctx.fillStyle = '#1a1a1e';
  ctx.fillRect(lx - 10, floorY - 12, 180, 12);

  // Coffee mug
  ctx.fillStyle = '#b0a898';
  ctx.beginPath();
  ctx.arc(dx + dw - 80, floorY - 24, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#98908a';
  ctx.beginPath();
  ctx.ellipse(dx + dw - 80, floorY - 24, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ceiling light — subtle warm pool
  const clGrad = ctx.createRadialGradient(W * 0.5, 0, 0, W * 0.5, 0, H * 0.45);
  clGrad.addColorStop(0, 'rgba(255,240,215,0.10)');
  clGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = clGrad;
  ctx.fillRect(0, 0, W, H * 0.5);

  // --- Orb glow on floor ---
  const ogGrad = ctx.createRadialGradient(W / 2, floorY + 30, 0, W / 2, floorY + 30, 300);
  ogGrad.addColorStop(0, 'rgba(99,102,241,0.3)');
  ogGrad.addColorStop(0.5, 'rgba(99,102,241,0.1)');
  ogGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = ogGrad;
  ctx.fillRect(W / 2 - 300, floorY - 20, 600, 120);

  // --- Overlay the orb screenshot using 'lighter' blend for the bright parts ---
  const img = new Image();
  await new Promise((resolve) => {
    img.onload = resolve;
    img.src = 'data:image/png;base64,' + orbB64;
  });
  // Use 'lighten' blend so the dark background disappears and bright orb shows through
  ctx.globalCompositeOperation = 'lighten';
  ctx.drawImage(img, 0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';

  // --- AR UI label ---
  const labelW = 340, labelH = 48;
  const labelX = (W - labelW) / 2, labelY = H - 80;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(labelX, labelY, labelW, labelH, 24);
  ctx.fill();
  ctx.stroke();
  // Green dot
  ctx.fillStyle = '#22c55e';
  ctx.shadowColor = 'rgba(34,197,94,0.5)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(labelX + 28, labelY + labelH / 2, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Text
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '500 22px -apple-system, sans-serif';
  ctx.fillText('Aether Companion', labelX + 48, labelY + 31);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '18px -apple-system, sans-serif';
  ctx.fillText('WebXR \u2022 Passthrough', labelX + 220, labelY + 31);
}, orbBase64);

await setTimeout(200);
await compositePage.screenshot({ path: `${SCREENSHOTS_DIR}ar-passthrough.png` });
console.log('ar-passthrough.png captured');
await compositePage.close();

// --- Chat conversation ---
await heroPage.type('#chat-input', 'What makes you different from cloud AI?');
await heroPage.click('#send-btn');
await setTimeout(15000); // Wait for LLM streaming
await heroPage.screenshot({ path: `${SCREENSHOTS_DIR}chat.png` });
console.log('chat.png captured');

// --- Mobile view ---
const mobilePage = await browser.newPage();
await mobilePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle0' });
await setTimeout(4000);
await mobilePage.screenshot({ path: `${SCREENSHOTS_DIR}mobile.png` });
console.log('mobile.png captured');

await browser.close();
console.log('All screenshots saved to docs/screenshots/');
