import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  optimizeDeps: {
    include: ["@warcabownik/shared"],
  },
  build: {
    commonjsOptions: {
      include: [/@warcabownik\/shared/, /node_modules/],
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
