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

// --- Chat conversation ---
await heroPage.type('#chat-input', 'What makes you different from cloud AI?');
await heroPage.click('#send-btn');
await setTimeout(15000); // Wait for LLM streaming
await heroPage.screenshot({ path: `${SCREENSHOTS_DIR}chat.png` });
console.log('chat.png captured');

// --- Transparent mode ---
await heroPage.click('#bg-toggle');
await setTimeout(1000);
await heroPage.screenshot({ path: `${SCREENSHOTS_DIR}transparent.png` });
console.log('transparent.png captured');

// --- Mobile view ---
const mobilePage = await browser.newPage();
await mobilePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle0' });
await setTimeout(4000);
await mobilePage.screenshot({ path: `${SCREENSHOTS_DIR}mobile.png` });
console.log('mobile.png captured');

await browser.close();
console.log('All screenshots saved to docs/screenshots/');
