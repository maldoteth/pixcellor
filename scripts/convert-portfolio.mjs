// Convert public/portfolio/*.png into responsive AVIF + WebP variants.
// Generates {name}-{w}.avif and {name}-{w}.webp at widths 480 and the original width.
// Originals (.png) are kept untouched as fallback for older browsers.
import sharp from "sharp";
import { readdirSync, statSync } from "fs";
import { join, parse } from "path";

const DIR = "public/portfolio";
const WIDTHS = [480, 960];

const files = readdirSync(DIR).filter((f) => f.endsWith(".png"));

let savedTotal = 0;
let originalTotal = 0;

for (const file of files) {
  const inputPath = join(DIR, file);
  const { name } = parse(file);
  const meta = await sharp(inputPath).metadata();
  const origSize = statSync(inputPath).size;
  originalTotal += origSize;

  // Cap variants at original width — never upscale.
  const widths = Array.from(new Set(WIDTHS.map((w) => Math.min(w, meta.width)))).sort(
    (a, b) => a - b,
  );

  for (const w of widths) {
    const base = sharp(inputPath).resize({ width: w, withoutEnlargement: true });

    const avifPath = join(DIR, `${name}-${w}.avif`);
    const webpPath = join(DIR, `${name}-${w}.webp`);

    await base.clone().avif({ quality: 50, effort: 4 }).toFile(avifPath);
    await base.clone().webp({ quality: 78 }).toFile(webpPath);

    savedTotal += statSync(avifPath).size + statSync(webpPath).size;
  }
  console.log(`${file}: ${(origSize / 1024).toFixed(0)}KB → ${widths.join(",")} variants`);
}

console.log(
  `\nDone. Originals: ${(originalTotal / 1024 / 1024).toFixed(2)}MB | Variants total: ${(savedTotal / 1024 / 1024).toFixed(2)}MB`,
);
