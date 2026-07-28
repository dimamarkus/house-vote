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
      // The extension must target the SAME Clerk instance as the web origin it
      // syncs with. That is often NOT the app's local dev key: `pnpm dev` needs
      // a `pk_test_...` key, while an extension that syncs with production needs
      // the `pk_live_...` key for the deployed site. Use a dedicated var so the
      // two can differ, mirroring `HOUSE_VOTE_EXTENSION_SYNC_HOST`.
      //
      // `syncHost` and `appUrl` are intentionally separate: for a production
      // Clerk instance the session cookie lives on the Frontend API domain
      // (e.g. clerk.your-domain.com) while the app + its extension API routes
      // are served from the primary domain. Collapsing them breaks either
      // session sync or the /api/extension/* calls.
      __HOUSE_VOTE_EXTENSION_CONFIG__: JSON.stringify({
        clerkPublishableKey: env.HOUSE_VOTE_EXTENSION_CLERK_PUBLISHABLE_KEY ?? '',
        syncHost: env.HOUSE_VOTE_EXTENSION_SYNC_HOST ?? '',
        appUrl: env.HOUSE_VOTE_EXTENSION_APP_URL ?? '',
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
