// Convert public/portfolio/*.png into responsive AVIF + WebP variants.
// Always emits {name}-sm.{avif,webp} (480w cap) and {name}-lg.{avif,webp} (960w cap),
// so consumer code can use a fixed naming scheme without checking what exists.
// Originals (.png) stay as fallback.
import sharp from "sharp";
import { readdirSync, statSync } from "fs";
import { join, parse } from "path";

const DIR = "public/portfolio";
const SMALL_W = 640;
const LARGE_W = 960;

const files = readdirSync(DIR).filter((f) => f.endsWith(".png"));

let originalTotal = 0;
let variantTotal = 0;

for (const file of files) {
  const inputPath = join(DIR, file);
  const { name } = parse(file);
  const meta = await sharp(inputPath).metadata();
  originalTotal += statSync(inputPath).size;

  const smW = Math.min(SMALL_W, meta.width);
  const lgW = Math.min(LARGE_W, meta.width);

  for (const [w, suffix] of [
    [smW, "sm"],
    [lgW, "lg"],
  ]) {
    const base = sharp(inputPath).resize({ width: w, withoutEnlargement: true });
    const avifPath = join(DIR, `${name}-${suffix}.avif`);
    const webpPath = join(DIR, `${name}-${suffix}.webp`);
    await base.clone().avif({ quality: 50, effort: 4 }).toFile(avifPath);
    await base.clone().webp({ quality: 78 }).toFile(webpPath);
    variantTotal += statSync(avifPath).size + statSync(webpPath).size;
  }
  console.log(`${file}: sm=${smW}px, lg=${lgW}px`);
}

console.log(
  `\nDone. Originals: ${(originalTotal / 1024 / 1024).toFixed(2)}MB | Variants total: ${(variantTotal / 1024 / 1024).toFixed(2)}MB`,
);
