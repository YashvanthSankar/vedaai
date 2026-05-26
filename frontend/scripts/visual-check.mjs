#!/usr/bin/env node
/**
 * Visual-check script. Boots a headless Chromium against http://localhost:PORT
 * and captures screenshots of each route at desktop + mobile viewports.
 *
 *   node scripts/visual-check.mjs [port]   # default 3003
 */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = process.argv[2] || '3003';
const base = `http://localhost:${port}`;
const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'visual-output');

const routes = [
  { path: '/assignments', name: 'assignments' },
  { path: '/assignments/new', name: 'assignments-new' },
  { path: '/home', name: 'home' },
];

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 2 });

for (const route of routes) {
  for (const vp of viewports) {
    const page = await ctx.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const url = `${base}${route.path}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    } catch (e) {
      console.error(`✗ ${url} @${vp.name}: ${e.message}`);
      await page.close();
      continue;
    }
    // brief settle for fonts / images
    await page.waitForTimeout(800);
    const file = `${outDir}/${route.name}-${vp.name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(`✓ ${file}`);
    await page.close();
  }
}

await ctx.close();
await browser.close();
