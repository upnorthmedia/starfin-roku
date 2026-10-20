import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

// Vector sources live outside images/ so they are not packaged into the channel.
// The wordmark and tagline are outlined glyphs (Montserrat SemiBold and Inter
// Regular, both OFL and bundled under fonts/), so rendering needs no system fonts.
const sources = {
  mark: await readFile('assets/brand/poppins-mark.svg'),
  wordmark: await readFile('assets/brand/poppins-wordmark.svg'),
  tagline: await readFile('assets/brand/poppins-tagline.svg'),
};

function background(width, height) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#121D33"/>
      <stop offset="1" stop-color="#060A13"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.5">
      <stop offset="0" stop-color="#2A4470" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#2A4470" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#base)"/>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
</svg>`);
}

async function renderAtHeight(svg, height) {
  return sharp(svg, { density: 1200 }).resize({ height }).png().toBuffer();
}

async function widthOf(buffer) {
  return (await sharp(buffer).metadata()).width;
}

// Mark above the wordmark (and optional tagline), centered as one block.
async function stackedLayers(width, height, { markHeight, wordHeight, tagHeight = 0, markGap, tagGap = 0 }) {
  const mark = await renderAtHeight(sources.mark, markHeight);
  const word = await renderAtHeight(sources.wordmark, wordHeight);
  const blockHeight = markHeight + markGap + wordHeight + (tagHeight ? tagGap + tagHeight : 0);
  let top = Math.round((height - blockHeight) / 2);
  const layers = [];
  for (const [input, rowHeight, gap] of [[mark, markHeight, markGap], [word, wordHeight, tagGap]]) {
    layers.push({ input, top, left: Math.round((width - await widthOf(input)) / 2) });
    top += rowHeight + gap;
  }
  if (tagHeight) {
    const tag = await renderAtHeight(sources.tagline, tagHeight);
    layers.push({ input: tag, top, left: Math.round((width - await widthOf(tag)) / 2) });
  }
  return layers;
}

// Mark beside the wordmark, centered as one block.
async function inlineLayers(width, height, { markHeight, wordHeight, gap }) {
  const mark = await renderAtHeight(sources.mark, markHeight);
  const word = await renderAtHeight(sources.wordmark, wordHeight);
  const markWidth = await widthOf(mark);
  const left = Math.round((width - (markWidth + gap + await widthOf(word))) / 2);
  return [
    { input: mark, left, top: Math.round((height - markHeight) / 2) },
    { input: word, left: left + markWidth + gap, top: Math.round((height - wordHeight) / 2) },
  ];
}

async function writeOnBackground(file, width, height, layers) {
  await sharp(background(width, height)).composite(layers).png().toFile(file);
}

async function writeScaled(source, file, width, height) {
  await sharp(source).resize(width, height).png().toFile(file);
}

const posterLayout = { markHeight: 236, wordHeight: 66, markGap: 30 };
await writeOnBackground('images/channel-fhd.png', 540, 405, await stackedLayers(540, 405, posterLayout));
await writeScaled('images/channel-fhd.png', 'images/channel-hd.png', 290, 218);
await writeOnBackground('images/channel-sd.png', 246, 140, await inlineLayers(246, 140, { markHeight: 96, wordHeight: 32, gap: 10 }));

const splashLayout = { markHeight: 460, wordHeight: 140, tagHeight: 40, markGap: 70, tagGap: 56 };
await writeOnBackground('images/splash-fhd.png', 1920, 1080, await stackedLayers(1920, 1080, splashLayout));
await writeScaled('images/splash-fhd.png', 'images/splash-hd.png', 1280, 720);
await writeOnBackground('images/splash-sd.png', 720, 480, await stackedLayers(720, 480, { markHeight: 200, wordHeight: 62, tagHeight: 18, markGap: 30, tagGap: 24 }));

// Transparent lockup for the sign-in screen, displayed at 650x150 over the theme background.
const loginLayers = await inlineLayers(800, 185, { markHeight: 176, wordHeight: 112, gap: 34 });
await sharp({ create: { width: 800, height: 185, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(loginLayers)
  .png()
  .toFile('images/logo-login-screen.png');
