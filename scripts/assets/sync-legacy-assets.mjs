import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mappings = JSON.parse(
  await fs.readFile(path.join(root, 'config/assets/legacy-url-map.json'), 'utf8'),
);

const overrides = JSON.parse(
  await fs.readFile(path.join(root, 'config/assets/legacy-source-map.json'), 'utf8'),
);
/** 由分類後的唯一圖片來源產生舊 URL 副本，保持既有資料庫圖片連結可用。 */ export async function syncLegacyAssets() {
  for (const [legacy, current] of Object.entries(mappings)) {
    const from = overrides[legacy]
      ? path.join(root, overrides[legacy])
      : path.join(root, 'frontend/public', current);
    const to = path.join(root, 'frontend/public', legacy);
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to);
  }
  console.log(`Assets: ${Object.keys(mappings).length} compatible URLs synchronized.`);
}
await syncLegacyAssets();
