import { defineConfig } from "vite";

export default defineConfig({
  base: "/postcreator/",
  build: {
    outDir: "dist",
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("compromise") || id.includes("nspell") || id.includes("enDictData")) {
            return "ai-grammar";
          }
          if (id.includes("html2canvas")) {
            return "canvas-export";
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    open: false,
  },
});
