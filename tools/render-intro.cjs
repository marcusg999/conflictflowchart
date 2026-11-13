/**
 * Renders the intro's image sequence (a riso map unfolding) and the still
 * fallback images, using the same WebGL renderer as the home screen.
 *
 * Needs the dev server running (npm run dev) and Playwright + ffmpeg:
 *   node tools/render-intro.cjs
 * Writes public/riso/intro-light/NN.webp, intro-dark/NN.webp, map-light.webp, map-dark.webp
 */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const FRAMES = 36;
const SIZE = 560;
const URL = 'http://localhost:5173/tools/riso-render.html';
const out = path.join(__dirname, '..', 'public', 'riso');
const ease = (p) => 0.5 - 0.5 * Math.cos(Math.PI * p);

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'riso-'));
  for (const theme of ['light', 'dark']) {
    const dir = path.join(out, `intro-${theme}`);
    fs.mkdirSync(dir, { recursive: true });
    await page.goto(`${URL}?size=${SIZE}&dark=${theme === 'dark' ? 1 : 0}&cell=4.5`);
    await page.waitForFunction(() => window.ready);
    const shot = async (file, fold, turn) => {
      await page.evaluate(([f, t]) => window.renderAt(f, t), [fold, turn]);
      const png = path.join(tmp, 'f.png');
      await page.screenshot({ path: png, omitBackground: true });
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-c:v', 'libwebp', '-quality', '72', '-compression_level', '6', file]);
    };
    for (let i = 0; i < FRAMES; i++) {
      const p = ease(i / (FRAMES - 1));
      // Starts folded shut and turned away; opens flat and turns toward you.
      await shot(path.join(dir, `${String(i).padStart(2, '0')}.webp`), 0.95 - 0.87 * p, -0.28 + 0.48 * p);
    }
    await shot(path.join(out, `map-${theme}.webp`), 0.42, 0.2);
  }
  await browser.close();
  console.log('done');
})();
