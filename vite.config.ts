/**
 * @u-connect/client-ts v1.0.0
 * https://github.com/undefinedofficial/u-connect-client-ts.git
 *
 * Copyright (c) 2024 https://github.com/undefinedofficial
 * Released under the MIT license
 */

import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), dts({ rollupTypes: true, include: ["u-connect/**/*"] })],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./example", import.meta.url))
    }
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL("./u-connect/index.ts", import.meta.url)),
      name: "u-connect-client-ts",
      fileName: "u-connect-client-ts",
      formats: ["cjs", "es"]
    }
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true
      }
    }
  }
});
