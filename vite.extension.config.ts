import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';

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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, '');

  return {
    root: extensionSourceDir,
    publicDir: false,
    define: {
      __HOUSE_VOTE_EXTENSION_CONFIG__: JSON.stringify({
        clerkPublishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '',
        syncHost: env.HOUSE_VOTE_EXTENSION_SYNC_HOST ?? '',
      }),
    },
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
  };
});
