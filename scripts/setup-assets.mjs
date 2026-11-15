/**
 * Menyiapkan aset runtime MediaPipe supaya aplikasi tidak bergantung pada CDN.
 * Dijalankan otomatis lewat `postinstall`.
 *
 * - WASM  : disalin dari node_modules ke public/mediapipe/wasm
 * - Model : diunduh sekali ke public/models/hand_landmarker.task
 */
import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const wasmDir = path.join(root, "public", "mediapipe", "wasm");
const wasmSource = path.join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const wasmFiles = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_module_internal.js",
  "vision_wasm_module_internal.wasm",
];

const modelDir = path.join(root, "public", "models");
const modelPath = path.join(modelDir, "hand_landmarker.task");
const modelUrl =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

async function setupWasm() {
  if (!existsSync(wasmSource)) {
    console.warn("[setup] tasks-vision belum terpasang, lewati penyalinan WASM.");
    return;
  }
  await mkdir(wasmDir, { recursive: true });
  for (const file of wasmFiles) {
    const from = path.join(wasmSource, file);
    if (!existsSync(from)) continue;
    await copyFile(from, path.join(wasmDir, file));
  }
  console.log("[setup] WASM MediaPipe siap di public/mediapipe/wasm");
}

async function setupModel() {
  if (existsSync(modelPath)) {
    const info = await stat(modelPath);
    if (info.size > 1_000_000) {
      console.log("[setup] Model hand_landmarker.task sudah ada.");
      return;
    }
  }
  await mkdir(modelDir, { recursive: true });
  console.log("[setup] Mengunduh model hand_landmarker.task (~7.5 MB)...");
  const res = await fetch(modelUrl);
  if (!res.ok) throw new Error(`Gagal mengunduh model: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(modelPath, buffer);
  console.log(`[setup] Model tersimpan (${(buffer.length / 1024 / 1024).toFixed(1)} MB).`);
}

await setupWasm();
await setupModel();
