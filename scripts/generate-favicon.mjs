import fs from "node:fs/promises";
import path from "node:path";
import sharp from "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js";

const root = process.cwd();
const source = path.join(root, "public", "favicon.svg");
const output = path.join(root, "public");
const render = (size) => sharp(source, { density: 1024 }).resize(size, size, { fit: "contain" }).png().toBuffer();
const ico = (png, size) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0); entry.writeUInt8(size === 256 ? 0 : size, 1);
  entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6); entry.writeUInt32LE(png.length, 8); entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, png]);
};

const [icon48, apple, icon192, icon512, icon256] = await Promise.all([render(48), render(180), render(192), render(512), render(256)]);
await Promise.all([
  fs.writeFile(path.join(output, "favicon-48.png"), icon48),
  fs.writeFile(path.join(output, "apple-touch-icon.png"), apple),
  fs.writeFile(path.join(output, "icon-192.png"), icon192),
  fs.writeFile(path.join(output, "icon-512.png"), icon512),
  fs.writeFile(path.join(output, "favicon.ico"), ico(icon256, 256)),
]);
