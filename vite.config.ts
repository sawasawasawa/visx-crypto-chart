import { defineConfig } from "vite";
import copy from "rollup-plugin-copy";

import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  // publicDir: 'assets',

  plugins: [
    react(),
    copy({
      targets: [{ src: "assets/*", dest: "dist/assets" }],
    }),
    // copy([{ src: "./src/assets/*", dest: "dist/assets/" }])
  ],
});
