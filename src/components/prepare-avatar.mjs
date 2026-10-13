/**
 * One-off asset pipeline: prepare the cartoon avatar portrait for the web.
 *
 * The avatar is the "flip side" of the hero headshot (the portrait frame on
 * the homepage flips over on click to reveal it). It must match the
 * headshot exactly:
 *   - same 4:5 editorial crop (head framed the same way, cut just below
 *     the elbows, arms crossed)
 *   - same black-and-white treatment (the headshot is monochrome)
 *   - same plain white background (baked into the source art already —
 *     it stays white even in dark mode, just like the headshot)
 *   - same export set: AVIF + WebP + JPEG at 1x (600w) and 2x (1200w)
 *
 * Run with:  node scripts/prepare-avatar.mjs
 * Re-run any time the source avatar changes.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const SRC = 'assets-source/avatar.png'; // original, kept out of the published site
const OUT = 'public/images';            // published assets live here

// The waving avatar (avatar-2.png) is drawn with object-fit:contain +
// object-position:bottom inside the frame, which letterboxes it: the frame
// is 4:5 but the image is wider, so ~27% of the frame height is empty
// headroom above the hair (plus the "Hi There!" text sits in that space).
// To match that framing, the flip avatar needs the SAME headroom — but its
// source only has 60px above the hair. So we extend the canvas upward with
// white, then crop 4:5.
//
// Target: hair at ~32% of the frame height (measured from the waving
// avatar's rendered position). The flip avatar's hair is at y=60 in the
// source, so we add 316px of white above it: hair lands at 376 of 1176
// = 32%.
const HEADROOM = 316; // px of white added above the source

// 4:5 crop window on the EXTENDED canvas (941 x 1988). Full width, bottom
// edge just below the crossed elbows (same as the waving avatar's cut).
const CROP = { left: 0, top: 0, width: 941, height: 1176 }; // 4:5

// 4:5 portrait at two resolutions (2x is for retina screens).
const SIZES = [
  { name: 'avatar-600', width: 600, height: 750 },
  { name: 'avatar-1200', width: 1200, height: 1500 },
];

await mkdir(OUT, { recursive: true });

for (const { name, width, height } of SIZES) {
  const base = sharp(SRC)
    // Add white headroom above the figure so its hair sits where the waving
    // avatar's hair does in the frame (see the note above).
    .extend({ top: HEADROOM, bottom: 0, left: 0, right: 0, background: '#ffffff' })
    .extract(CROP)      // the 4:5 window on the extended canvas
    .resize(width, height)
    .grayscale();       // monochrome, to match the headshot

  await base.clone().avif({ quality: 55 }).toFile(`${OUT}/${name}.avif`);
  await base.clone().webp({ quality: 78 }).toFile(`${OUT}/${name}.webp`);
  await base.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(`${OUT}/${name}.jpg`);

  console.log(`wrote ${name}.{avif,webp,jpg}`);
}
