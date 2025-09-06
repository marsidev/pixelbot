import { defineConfig } from "bumpp";

export default defineConfig({
  files: ["package.json", "manifest.json", "updates.json"],
  commit: "chore: release v%s",
  tag: "v%s",
  push: true,
  confirm: true,
});
