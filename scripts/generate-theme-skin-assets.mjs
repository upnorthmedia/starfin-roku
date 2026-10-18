import sharp from 'sharp';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Generates every image asset for the Liquid Glass and Cinema themes under
// images/themes/{liquid-glass,cinema}. Run from the repository root:
//   node scripts/generate-theme-skin-assets.mjs
// Panels are nine-patch PNGs with the rim, top specular and drop shadow baked in,
// so Roku stretches only the uniform interior. Backgrounds are dithered gradients.
// Cinema also gets re-cornered focus frames and masks derived from the shared
// originals so their geometry stays identical.

const profiles = [['fhd', 1], ['hd', 2 / 3]];

const skins = {
  'liquid-glass': {
    base: '#0C1018',
    background: `
      <defs>
        <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#151B27"/><stop offset="0.6" stop-color="#0C1018"/><stop offset="1" stop-color="#06080D"/>
        </linearGradient>
        <radialGradient id="a" cx="0.15" cy="0.0" r="0.85">
          <stop offset="0" stop-color="#2A3650" stop-opacity="0.62"/><stop offset="1" stop-color="#2A3650" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="b" cx="0.9" cy="1.0" r="0.7">
          <stop offset="0" stop-color="#1C2436" stop-opacity="0.55"/><stop offset="1" stop-color="#1C2436" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#v)"/>
      <rect width="1920" height="1080" fill="url(#a)"/>
      <rect width="1920" height="1080" fill="url(#b)"/>`,
    panels: {
      'dialog-panel': { radius: 30, margin: 22, fill: 'rgba(26,30,42,0.82)', rim: 'rgba(255,255,255,0.38)', specular: 'rgba(255,255,255,0.65)', shadow: 0.5 },
      'header-menu-fill': { radius: 28, margin: 18, fill: 'rgba(18,22,32,0.78)', rim: 'rgba(255,255,255,0)', specular: 'rgba(255,255,255,0)', shadow: 0.45 },
      'header-menu-glass': { radius: 28, margin: 18, fill: 'rgba(255,255,255,0.10)', rim: 'rgba(255,255,255,0.32)', specular: 'rgba(255,255,255,0.6)', shadow: 0 },
      'nav-glass': { radius: 38, margin: 14, fill: 'rgba(255,255,255,0.14)', rim: 'rgba(255,255,255,0.36)', specular: 'rgba(255,255,255,0.65)', shadow: 0.35 },
      'card': { radius: 16, margin: 2, fill: 'rgba(255,255,255,0.085)', rim: 'rgba(255,255,255,0.20)', specular: 'rgba(255,255,255,0.38)', shadow: 0 },
      'button': { radius: 12, margin: 6, fill: 'rgba(255,255,255,0.16)', rim: 'rgba(255,255,255,0.30)', specular: 'rgba(255,255,255,0.55)', shadow: 0.25 },
      'button-focused': { radius: 12, margin: 6, fill: '#FFFFFF', rim: 'rgba(255,255,255,0)', specular: 'rgba(255,255,255,0)', shadow: 0.25 },
      'pill': { radius: 29, margin: 10, fill: 'rgba(255,255,255,0.16)', rim: 'rgba(255,255,255,0.32)', specular: 'rgba(255,255,255,0.6)', shadow: 0.3 },
      'pill-focused': { radius: 29, margin: 10, fill: '#FFFFFF', rim: 'rgba(255,255,255,0)', specular: 'rgba(255,255,255,0)', shadow: 0.3 },
      'input': { radius: 16, margin: 6, fill: 'rgba(255,255,255,0.10)', rim: 'rgba(255,255,255,0.26)', specular: 'rgba(255,255,255,0.5)', shadow: 0.2 },
      'input-focus': { radius: 22, margin: 2, fill: 'rgba(255,255,255,0)', rim: '#FFFFFF', rimWidth: 4, specular: 'rgba(255,255,255,0)', shadow: 0 },
      'progress-track': { radius: 5, margin: 1, fill: 'rgba(0,0,0,0.5)', rim: 'rgba(255,255,255,0.18)', rimWidth: 1, specular: 'rgba(255,255,255,0)', shadow: 0 },
      'progress-fill': { radius: 5, margin: 1, fill: '#FFFFFF', rim: 'rgba(255,255,255,0)', specular: 'rgba(255,255,255,0)', shadow: 0 },
      'header-button-focused': { radius: 28, margin: 2, fill: '#FFFFFF', rim: 'rgba(255,255,255,0)', specular: 'rgba(255,255,255,0)', shadow: 0 }
    },
    square: { radius: 14, fill: 'rgba(255,255,255,0.16)', rim: 'rgba(255,255,255,0.20)', specular: 'rgba(255,255,255,0.38)' },
    detailedCard: { radius: 18, fill: 'rgba(255,255,255,0.085)', rim: 'rgba(255,255,255,0.20)', specular: 'rgba(255,255,255,0.38)' },
    mediaShellGradient: { left: 0, bottom: 0.98 },
    focusFrames: null,
    masks: null
  },
  cinema: {
    base: '#141414',
    background: `
      <defs>
        <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#181818"/><stop offset="1" stop-color="#0F0F0F"/>
        </linearGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#v)"/>`,
    panels: {
      'dialog-panel': { radius: 8, margin: 18, fill: 'rgba(24,24,24,0.98)', rim: 'rgba(255,255,255,0)', specular: 'rgba(255,255,255,0)', shadow: 0.6 },
      'header-menu-fill': { radius: 6, margin: 12, fill: 'rgba(10,10,10,0.94)', rim: 'rgba(255,255,255,0)', specular: 'rgba(255,255,255,0)', shadow: 0.5 },
      'header-menu-glass': { radius: 6, margin: 12, fill: 'rgba(255,255,255,0)', rim: 'rgba(255,255,255,0.18)', specular: 'rgba(255,255,255,0)', shadow: 0 },
      'nav-glass': { radius: 38, margin: 2, fill: 'rgba(0,0,0,0)', rim: 'rgba(255,255,255,0)', specular: 'rgba(255,255,255,0)', shadow: 0 },
      'card': { radius: 8, margin: 2, fill: '#232323', rim: 'rgba(255,255,255,0)', specular: 'rgba(255,255,255,0)', shadow: 0 },
      'button': { radius: 6, margin: 4, fill: 'rgba(109,109,110,0.7)', rim: 'rgba(255,255,255,0)', specular: 'rgba(255,255,255,0)', shadow: 0 },
      'button-focused': { radius: 6, margin: 4, fill: '#FFFFFF', rim: 'rgba(255,255,255,0)', specular: 'rgba(255,255,255,0)', shadow: 0 },
      'pill': { radius: 6, margin: 4, fill: 'rgba(109,109,110,0.7)', rim: 'rgba(255,255,255,0)', specular: 'rgba(255,255,255,0)', shadow: 0 },
      'pill-focused': { radius: 6, margin: 4, fill: '#FFFFFF', rim: 'rgba(255,255,255,0)', specular: 'rgba(255,255,255,0)', shadow: 0 },
      'input': { radius: 6, margin: 4, fill: '#333333', rim: 'rgba(255,255,255,0)', specular: 'rgba(255,255,255,0)', shadow: 0 },
      'input-focus': { radius: 10, margin: 2, fill: 'rgba(255,255,255,0)', rim: '#FFFFFF', rimWidth: 4, specular: 'rgba(255,255,255,0)', shadow: 0 },
      'progress-track': { radius: 0, margin: 1, fill: 'rgba(77,77,77,0.9)', rim: 'rgba(255,255,255,0)', specular: 'rgba(255,255,255,0)', shadow: 0 },
      'progress-fill': { radius: 0, margin: 1, fill: '#E50914', rim: 'rgba(255,255,255,0)', specular: 'rgba(255,255,255,0)', shadow: 0 },
      'header-button-focused': { radius: 6, margin: 2, fill: '#FFFFFF', rim: 'rgba(255,255,255,0)', specular: 'rgba(255,255,255,0)', shadow: 0 }
    },
    square: { radius: 6, fill: '#2A2A2A', rim: 'rgba(255,255,255,0)', specular: 'rgba(255,255,255,0)' },
    detailedCard: { radius: 8, fill: '#1F1F1F', rim: 'rgba(255,255,255,0)', specular: 'rgba(255,255,255,0)' },
    mediaShellGradient: { left: 0.92, bottom: 0.98 },
    focusFrames: { radius: 6, thickness: 5 },
    masks: { radius: 6 }
  }
};

// Nine-patch panel: uniform fill, rim stroke, one-pixel top specular, baked shadow.
async function renderPanel(spec, scale) {
  const radius = Math.max(0, Math.round(spec.radius * scale));
  const margin = Math.max(1, Math.round(spec.margin * scale));
  const rimWidth = (spec.rimWidth ?? 1.5) * scale;
  const inner = 2 * (radius + margin) + 1;
  const x = margin, y = margin, w = inner - 2 * margin, h = inner - 2 * margin;
  const shadowLayer = spec.shadow > 0 ? `
    <defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${Math.max(1, margin / 2.2)}"/></filter></defs>
    <rect x="${x}" y="${y + margin / 3}" width="${w}" height="${h}" rx="${radius}" fill="black" fill-opacity="${spec.shadow}" filter="url(#s)"/>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${inner}" height="${inner}">
    ${shadowLayer}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${spec.fill}"/>
    <rect x="${x + rimWidth / 2}" y="${y + rimWidth / 2}" width="${w - rimWidth}" height="${h - rimWidth}" rx="${Math.max(0, radius - rimWidth / 2)}" fill="none" stroke="${spec.rim}" stroke-width="${rimWidth}"/>
    <clipPath id="c"><rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" rx="${Math.max(0, radius - 2)}"/></clipPath>
    <rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${Math.max(1, 1.2 * scale)}" fill="${spec.specular}" clip-path="url(#c)"/>
  </svg>`;
  const raw = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
  const edge = inner + 2;
  const pixels = Buffer.alloc(edge * edge * 4);
  for (let row = 0; row < inner; row++) raw.copy(pixels, ((row + 1) * edge + 1) * 4, row * inner * 4, (row + 1) * inner * 4);
  const center = 1 + Math.floor(inner / 2);
  for (const [px, py] of [[center, 0], [center, edge - 1], [0, center], [edge - 1, center]]) pixels[(py * edge + px) * 4 + 3] = 255;
  return sharp(pixels, { raw: { width: edge, height: edge, channels: 4 } }).png().toBuffer();
}

async function renderRoundedTile(width, height, spec) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect x="0" y="0" width="${width}" height="${height}" rx="${spec.radius}" fill="${spec.fill}"/>
    <rect x="0.75" y="0.75" width="${width - 1.5}" height="${height - 1.5}" rx="${Math.max(0, spec.radius - 0.75)}" fill="none" stroke="${spec.rim}" stroke-width="1.5"/>
    <clipPath id="c"><rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="${Math.max(0, spec.radius - 2)}"/></clipPath>
    <rect x="2" y="2" width="${width - 4}" height="1.2" fill="${spec.specular}" clip-path="url(#c)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// Repeating sub-level dither softens 8-bit banding, matching generate-theme-backgrounds.mjs.
// Rendered at half resolution: the ThemeBackground Poster stretches it, and the texture
// costs a quarter of a full 1080p bitmap on the device.
async function renderBackground(skin) {
  const width = 960, height = 540;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="${skin.base}"/>${skin.background}</svg>`;
  const raw = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dither = (bayer[(y % 4) * 4 + x % 4] + 0.5) / 16 - 0.5;
      const offset = (y * width + x) * 3;
      for (let c = 0; c < 3; c++) raw[offset + c] = Math.max(0, Math.min(255, Math.round(raw[offset + c] + dither)));
    }
  }
  return sharp(raw, { raw: { width, height, channels: 3 } }).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
}

// Media shell overlay: fades artwork into the theme canvas from the left and the bottom.
// Gradients are rendered small and stretched by the Poster so they cost a fraction of a
// full-screen texture.
async function renderMediaShellGradient(skin) {
  const left = skin.mediaShellGradient.left > 0 ? `<rect width="1920" height="1080" fill="url(#l)"/>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 1920 1080">
    <defs>
      <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0.45" stop-color="${skin.base}" stop-opacity="0"/><stop offset="0.72" stop-color="${skin.base}" stop-opacity="0.78"/><stop offset="1" stop-color="${skin.base}" stop-opacity="${skin.mediaShellGradient.bottom}"/></linearGradient>
      <linearGradient id="l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${skin.base}" stop-opacity="${skin.mediaShellGradient.left}"/><stop offset="0.42" stop-color="${skin.base}" stop-opacity="0.55"/><stop offset="0.72" stop-color="${skin.base}" stop-opacity="0"/></linearGradient>
    </defs>
    ${left}
    <rect width="1920" height="1080" fill="url(#b)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
}

// Home billboard overlay: artwork fades into the canvas on the left and at the bottom
// so the logo and synopsis stay legible and the shelves below start on solid canvas.
async function renderBillboardFade(skin) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="190" viewBox="0 0 1920 760">
    <defs>
      <linearGradient id="l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${skin.base}" stop-opacity="0.96"/><stop offset="0.38" stop-color="${skin.base}" stop-opacity="0.72"/><stop offset="0.68" stop-color="${skin.base}" stop-opacity="0"/></linearGradient>
      <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0.5" stop-color="${skin.base}" stop-opacity="0"/><stop offset="0.82" stop-color="${skin.base}" stop-opacity="0.85"/><stop offset="1" stop-color="${skin.base}" stop-opacity="1"/></linearGradient>
    </defs>
    <rect width="1920" height="760" fill="url(#l)"/>
    <rect width="1920" height="760" fill="url(#b)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
}

// Reads the opaque outer box and the transparent inner hole of an existing focus frame.
async function measureFrame(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const alpha = (x, y) => data[(y * width + x) * 4 + 3];
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (alpha(x, y) > 64) { if (x < left) left = x; if (x > right) right = x; if (y < top) top = y; if (y > bottom) bottom = y; }
  const midY = Math.floor((top + bottom) / 2), midX = Math.floor((left + right) / 2);
  let innerLeft = left; while (innerLeft <= right && alpha(innerLeft, midY) > 64) innerLeft++;
  let innerRight = right; while (innerRight >= left && alpha(innerRight, midY) > 64) innerRight--;
  let innerTop = top; while (innerTop <= bottom && alpha(midX, innerTop) > 64) innerTop++;
  let innerBottom = bottom; while (innerBottom >= top && alpha(midX, innerBottom) > 64) innerBottom--;
  return { width, height, outer: { left, top, right, bottom }, inner: { left: innerLeft, top: innerTop, right: innerRight, bottom: innerBottom } };
}

// Redraws a focus frame with new corners around the same tile footprint.
async function renderFrame(file, spec, scale) {
  const m = await measureFrame(file);
  const thickness = Math.max(2, Math.round(spec.thickness * scale));
  const outerRadius = Math.round(spec.radius * scale) + thickness;
  const innerRadius = Math.round(spec.radius * scale);
  const inner = m.inner;
  const ox = inner.left - thickness, oy = inner.top - thickness;
  const ow = inner.right - inner.left + 1 + 2 * thickness, oh = inner.bottom - inner.top + 1 + 2 * thickness;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${m.width}" height="${m.height}">
    <path fill="#FFFFFF" fill-rule="evenodd" d="${roundedRectPath(ox, oy, ow, oh, outerRadius)} ${roundedRectPath(inner.left, inner.top, inner.right - inner.left + 1, inner.bottom - inner.top + 1, innerRadius)}"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function roundedRectPath(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  return `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
}

async function renderMask(file, spec, scale) {
  const meta = await sharp(file).metadata();
  const radius = Math.max(1, Math.round(spec.radius * scale));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${meta.height}"><rect width="${meta.width}" height="${meta.height}" rx="${radius}" fill="#FFFFFF"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

const focusFrameSources = [
  ['images/homepage', ['home-page-music-focus.png', 'home-page-my-media-thumbnail-focus.png', 'home-page-poster-focus.png', 'home-page-thumbnail-focus.png', 'person-episode-focus.png']],
  ['images/library', ['poster-3-col-focus.png', 'poster-4-col-focus.png', 'poster-5-col-focus.png', 'poster-6-col-focus.png', 'thumbnail-2-col-focus.png', 'thumbnail-3-col-focus.png', 'thumbnail-4-col-focus.png']]
];
const sharedFocusFrames = ['images/tv-show/season-poster-focus-207x381.png', 'images/tv-show/season-poster-focus-400x672.png', 'images/tv-season/episode-thumbnail-vertical-focus-576x591.png', 'images/tv-season/episode-thumbnail-horizontal-focus-576x591.png', 'images/library/detailed-focus-936x591.png'];
const maskNames = ['poster-3-col-mask.png', 'poster-4-col-mask.png', 'poster-5-col-mask.png', 'poster-6-col-mask.png', 'thumbnail-2-col-mask.png', 'thumbnail-3-col-mask.png', 'thumbnail-4-col-mask.png', 'episode-thumbnail-mask.png', 'season-poster-mask.png', 'season-poster-large-mask.png', 'detailed-card-mask.png', 'detailed-poster-mask.png', 'movie-poster-mask.png', 'filmography-movie-mask.png'];

for (const [name, skin] of Object.entries(skins)) {
  const root = `images/themes/${name}`;
  await mkdir(root, { recursive: true });
  await writeFile(`${root}/background.png`, await renderBackground(skin));
  await writeFile(`${root}/media-shell-gradient.png`, await renderMediaShellGradient(skin));
  await writeFile(`${root}/billboard-fade.png`, await renderBillboardFade(skin));
  await writeFile(`${root}/square-button-background.png`, await renderRoundedTile(64, 64, skin.square));
  await writeFile(`${root}/detailed-card-panel.png`, await renderRoundedTile(882, 496, skin.detailedCard));
  for (const [profile, scale] of profiles) {
    await mkdir(`${root}/${profile}`, { recursive: true });
    for (const [panel, spec] of Object.entries(skin.panels)) {
      await writeFile(`${root}/${profile}/${panel}.9.png`, await renderPanel(spec, scale));
    }
    if (skin.focusFrames) {
      await mkdir(`${root}/focus/${profile}`, { recursive: true });
      for (const [dir, files] of focusFrameSources) {
        for (const file of files) {
          const source = `${dir}/${profile}/${file}`;
          await writeFile(`${root}/focus/${profile}/${file}`, await renderFrame(source, skin.focusFrames, scale)).catch(() => {});
        }
      }
      const hdFirst = `images/homepage/${profile}/home-page-my-media-first-focus.png`;
      await renderFrame(hdFirst, skin.focusFrames, scale).then(png => writeFile(`${root}/focus/${profile}/home-page-my-media-first-focus.png`, png)).catch(() => {});
    }
    if (skin.masks) {
      await mkdir(`${root}/masks/${profile}`, { recursive: true });
      for (const mask of maskNames) {
        await renderMask(`images/masks/${profile}/${mask}`, skin.masks, scale).then(png => writeFile(`${root}/masks/${profile}/${mask}`, png)).catch(() => {});
      }
    }
  }
  if (skin.focusFrames) {
    await mkdir(`${root}/focus/shared`, { recursive: true });
    for (const file of sharedFocusFrames) {
      await writeFile(`${root}/focus/shared/${path.basename(file)}`, await renderFrame(file, skin.focusFrames, 1));
    }
  }
  const written = (await readdir(root, { recursive: true })).filter(f => f.endsWith('.png')).length;
  console.log(`${name}: ${written} assets`);
}
