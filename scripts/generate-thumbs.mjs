import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import { join, basename, extname } from "node:path";

const ASSETS = join(process.cwd(), "assets");
const ORIGINALS = join(ASSETS, "originals");
const THUMBS = join(ASSETS, "thumbs");
const FULL = join(ASSETS, "full");
const PROFILE = join(ASSETS, "profile");

const WEBP_QUALITY_THUMB = 72;
const WEBP_QUALITY_FULL = 78;

const KEY_ART = [
  "satisfactory-key-art-no-logo-2048x1152.jpg",
  "kungfury-street-rage-keyart2.jpg",
  "invector-keyart.jpg",
  "dark-rooms-keyart2.jpg",
  "taekwondo-key-art.jpg",
  "KungFury-C64-keyart.jpg",
  "avicii-gravity-keyart.jpg",
  "trailer-keyart2.jpg",
];

const GALLERY_SHOTS = [
  "satisfactory-01.jpg", "satisfactory-02.jpg", "satisfactory-03.jpg",
  "brickedengine-01.jpg", "brickedengine-02.jpg",
  "bricked-engine.jpg",
  "kungfury-01.jpg", "kungfury-02.jpg", "kungfury-03.jpg",
  "invector-01.jpg", "invector-02.jpg", "invector-03.jpg", "invector-04.jpg",
  "dark-rooms-01.jpg", "dark-rooms-02.jpg", "dark-rooms-03.jpg",
  "taekwondo-01.jpg", "taekwondo-02.jpg", "taekwondo-03.jpg",
  "kungFury-C64-01.jpg", "kungFury-C64-02.jpg",
  "Avicii-Gravity-HD-2830568926.jpg", "gravity.jpg",
  "findaway-01.jpg", "findaway-02.jpg", "findaway-03.jpg",
  "Find-a-Way-Soccer-for-Windows-8_7-1949492389.jpg",
];

const PROFILE_PIC = "0B7A8204_1x1.jpg";

async function ensureDir(d) {
  await mkdir(d, { recursive: true });
}

async function makeThumb(src, dest, width) {
  await sharp(src)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY_THUMB })
    .toFile(dest);
}

async function makeFull(src, dest, maxWidth = 1920) {
  await sharp(src)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY_FULL })
    .toFile(dest);
}

function outName(file) {
  return basename(file, extname(file)) + ".webp";
}

async function main() {
  await ensureDir(THUMBS);
  await ensureDir(FULL);
  await ensureDir(PROFILE);

  let origTotal = 0, newTotal = 0;
  const report = [];

  const handle = async (file, kind) => {
    const src = join(ORIGINALS, file);
    const meta = await sharp(src).metadata();
    const { size } = await import("node:fs/promises").then(m => m.stat(src));
    origTotal += size;

    if (kind === "profile") {
      const dest = join(PROFILE, outName(file));
      await makeThumb(src, dest, 200);
      const ns = (await import("node:fs/promises").then(m => m.stat(dest))).size;
      newTotal += ns;
      report.push({ file, kind, from: size, to: ns, out: "profile/" + outName(file) });
    } else if (kind === "keyart") {
      // Key art shown in card at ~500-700px -> 900px thumb, 1920px full
      const thumbDest = join(THUMBS, outName(file));
      const fullDest = join(FULL, outName(file));
      await makeThumb(src, thumbDest, 900);
      await makeFull(src, fullDest, 1920);
      const ts = (await import("node:fs/promises").then(m => m.stat(thumbDest))).size;
      const fs = (await import("node:fs/promises").then(m => m.stat(fullDest))).size;
      newTotal += ts + fs;
      report.push({ file, kind, from: size, to: ts, out: "thumbs/" + outName(file), note: "thumb" });
      report.push({ file, kind, from: size, to: fs, out: "full/" + outName(file), note: "full" });
    } else {
      // Gallery screenshots: 480px thumb + 1920px full
      const thumbDest = join(THUMBS, outName(file));
      const fullDest = join(FULL, outName(file));
      await makeThumb(src, thumbDest, 480);
      await makeFull(src, fullDest, 1920);
      const ts = (await import("node:fs/promises").then(m => m.stat(thumbDest))).size;
      const fs = (await import("node:fs/promises").then(m => m.stat(fullDest))).size;
      newTotal += ts + fs;
      report.push({ file, kind, from: size, to: ts, out: "thumbs/" + outName(file), note: "thumb" });
      report.push({ file, kind, from: size, to: fs, out: "full/" + outName(file), note: "full" });
    }
  };

  for (const f of KEY_ART) await handle(f, "keyart");
  for (const f of GALLERY_SHOTS) await handle(f, "gallery");
  await handle(PROFILE_PIC, "profile");

  const fmt = (b) => (b / 1024).toFixed(0) + " KB";
  console.log("\n=== Image optimization report ===\n");
  console.log("source".padEnd(40), "kind".padEnd(8), "from".padStart(10), "to".padStart(10), "out");
  console.log("-".repeat(90));
  for (const r of report) {
    console.log(r.file.padEnd(40), (r.note || r.kind).padEnd(8), fmt(r.from).padStart(10), fmt(r.to).padStart(10), "  " + r.out);
  }
  console.log("-".repeat(90));
  console.log("TOTAL originals:".padEnd(58), fmt(origTotal).padStart(10));
  console.log("TOTAL generated:".padEnd(58), fmt(newTotal).padStart(10));
  console.log("Savings on originals served initially:".padEnd(58), (100 * (1 - newTotal / origTotal)).toFixed(0) + "%");
}

main().catch(e => { console.error(e); process.exit(1); });