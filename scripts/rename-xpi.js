import { readdir, rename } from "node:fs/promises";
import { join } from "node:path";

const ARTIFACTS_DIR = "web-ext-artifacts";
const OUTPUT_NAME = "pixelbot.xpi";

async function renameXpi() {
  try {
    const files = await readdir(ARTIFACTS_DIR);
    const zipFile = files.find((file) => file.endsWith(".zip"));

    if (!zipFile) {
      console.error("❌ No .zip file found in web-ext-artifacts/");
      process.exit(1);
    }

    const oldPath = join(ARTIFACTS_DIR, zipFile);
    const newPath = join(ARTIFACTS_DIR, OUTPUT_NAME);

    await rename(oldPath, newPath);
    console.log(`✅ Done! Created ${OUTPUT_NAME}`);
  } catch (error) {
    console.error("❌ Error renaming XPI file:", error.message);
    process.exit(1);
  }
}

renameXpi();
