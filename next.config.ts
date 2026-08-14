import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@hyzyla/pdfium", "sharp", "tesseract.js"],
  outputFileTracingIncludes: {
    "/api/intake/documents": [
      "./node_modules/tesseract.js/**/*",
      "./node_modules/tesseract.js-core/**/*",
      "./node_modules/@tesseract.js-data/fra/**/*",
      "./node_modules/@hyzyla/pdfium/**/*",
      "./node_modules/bmp-js/**/*",
      "./node_modules/idb-keyval/**/*",
      "./node_modules/is-url/**/*",
      "./node_modules/node-fetch/**/*",
      "./node_modules/regenerator-runtime/**/*",
      "./node_modules/wasm-feature-detect/**/*",
      "./node_modules/zlibjs/**/*",
    ],
  },
};

export default nextConfig;
