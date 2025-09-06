import { defineConfig } from "rolldown";

export default defineConfig({
  input: "./overrideScript.js",
  output: {
    file: "dist/override.js",
    format: "iife",
    name: "PixelbotOverride",
    extend: true, // This allows extending existing globals
  },
  platform: "browser", // Built-in browser optimizations
  target: "esnext", // Or 'es2020' for broader compatibility
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    process: "({env:{NODE_ENV:'production'}})",
  },
  watch: {
    clearScreen: false,
    exclude: ["node_modules/**", "dist/**", "references/**", "scripts/**"],
    include: [
      "src/**/*.js",
      "src/**/*.html",
      "src/**/*.css",
      "overrideScript.js",
      "background.js",
      "injector.js",
      "manifest.json",
      "updates.json",
    ],
  },
});
