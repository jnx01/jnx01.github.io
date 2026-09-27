/**
 * One-off asset pipeline: prepare the hero headshot for the web.
 *
 * What it does (strategy §F):
 *   - crops the portrait source to a 4:5 editorial ratio (chest-up)
 *   - applies a gentle warm grade so the photo sits in the site palette
 *   - exports AVIF + WebP + JPEG fallback at 1x (600w) and 2x (1200w)
 *   - writes everything to public/images/ with content-stable names
 *
 * Run with:  node scripts/prepare-headshot.mjs
 * Re-run any time the source headshot changes.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const SRC = 'assets-source/headshot.png'; // original, kept out of the published site
const OUT = 'public/images';              // published assets live here

// 4:5 portrait at two resolutions (2x is for retina screens).
const SIZES = [
  { name: 'headshot-600', width: 600, height: 750 },
  { name: 'headshot-1200', width: 1200, height: 1500 },
];

await mkdir(OUT, { recursive: true });

for (const { name, width, height } of SIZES) {
  // Crop: cover the 4:5 frame, keeping the upper portion (face) in frame.
  // 'attention' focuses the crop on the detected point of interest (the face).
  const base = sharp(SRC)
    .resize(width, height, { fit: 'cover', position: 'attention' })
    // Gentle grade: slightly warm + soft contrast so the photo harmonizes
    // with the warm off-white background. Deliberately subtle.
    .modulate({ saturation: 0.92, brightness: 1.02 })
    .linear(1.02, -2); // +2% contrast, tiny black lift

  await base.clone().avif({ quality: 55 }).toFile(`${OUT}/${name}.avif`);
  await base.clone().webp({ quality: 78 }).toFile(`${OUT}/${name}.webp`);
  await base.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(`${OUT}/${name}.jpg`);

  console.log(`wrote ${name}.{avif,webp,jpg}`);
}
