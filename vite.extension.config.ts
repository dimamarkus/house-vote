import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const extensionRoot = resolve(projectRoot, 'chrome-extension');
const extensionSourceDir = resolve(extensionRoot, 'src');
const extensionDistDir = resolve(extensionRoot, 'dist');

function copyChromeExtensionStaticFiles(): Plugin {
  return {
    name: 'copy-chrome-extension-static-files',
    apply: 'build',
    async closeBundle() {
      await mkdir(extensionDistDir, { recursive: true });

      await Promise.all([
        copyFile(resolve(extensionRoot, 'manifest.json'), resolve(extensionDistDir, 'manifest.json')),
        copyFile(resolve(extensionSourceDir, 'listing-parser.js'), resolve(extensionDistDir, 'listing-parser.js')),
      ]);
    },
  };
}

export default defineConfig({
  root: extensionSourceDir,
  publicDir: false,
  build: {
    outDir: extensionDistDir,
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        popup: resolve(extensionSourceDir, 'popup.html'),
        background: resolve(extensionSourceDir, 'background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  plugins: [copyChromeExtensionStaticFiles()],
});
