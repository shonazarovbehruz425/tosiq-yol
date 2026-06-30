import { defineConfig } from "vite";
import legacy from "@vitejs/plugin-legacy";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dotboxDist = resolve(__dirname, "..", "DotBox", "dist");

// Dev-only plugin: serve DotBox dist files from /dotbox/ so the iframe works
// without building the client first.
function dotboxServePlugin() {
  return {
    name: "dotbox-serve",
    configureServer(server) {
      server.middlewares.use("/dotbox", (req, res, next) => {
        // Strip /dotbox prefix
        const url = req.url === "/" ? "/index.html" : req.url;
        const filePath = resolve(dotboxDist, url.slice(1));
        if (existsSync(filePath)) {
          const content = readFileSync(filePath);
          const ext = filePath.split(".").pop();
          const mime = { html: "text/html", js: "application/javascript", css: "text/css", svg: "image/svg+xml", json: "application/json" }[ext] || "application/octet-stream";
          res.setHeader("Content-Type", mime);
          res.end(content);
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  root: "./",
  plugins: [
    dotboxServePlugin(),
    // Generate an ES5 + polyfilled bundle for old engines (Telegram Desktop
    // on Windows uses a legacy EdgeHTML/Chakra WebView that can't run modern JS).
    legacy({
      targets: ["chrome >= 64", "edge >= 18", "safari >= 11"],
      additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
      renderLegacyChunks: true,
      polyfills: true,
    }),
    {
      // @vitejs/plugin-legacy v8 injects a data: URL static import to detect
      // import.meta.resolve support.  iOS Telegram's WKWebView blocks data: URL
      // ES-module imports (CSP restriction), so the check silently fails and
      // __vite_is_modern_browser is never set.  The legacy-loader then also runs
      // and downloads the 370 kB legacy bundle alongside the modern bundle,
      // pushing the combined load past the 9-second watchdog timeout.
      // Fix: strip the data: URL import; the remaining checks (dynamic import,
      // async generators) still correctly fingerprint truly-modern browsers.
      name: "patch-legacy-modernness-check",
      enforce: "post",
      transformIndexHtml(html) {
        return html.replace(/import'data:[^']*';/g, "");
      },
    },
  ],
  server: {
    port: 5173,
    host: true, // Listen on all network addresses (helpful for testing on mobile via local IP)
    proxy: {
      "/ws": {
        target: "ws://localhost:3000",
        ws: true,
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "../dist", // Output to a shared folder if needed, or default to dist
    emptyOutDir: true,
    // Note: build.target is overridden by @vitejs/plugin-legacy when
    // renderLegacyChunks is true — set the target via the plugin's `targets`
    // option instead.  Keeping cssTarget for older desktop WebViews.
    cssTarget: "chrome70",
  },
});
