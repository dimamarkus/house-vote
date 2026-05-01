# House Vote Chrome Extension

## Local Development

Build the extension from the repo root:

```bash
pnpm extension:build
```

For iterative work:

```bash
pnpm extension:watch
```

Load the built extension in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked**.
4. Select `chrome-extension/dist`.

The source files live in `chrome-extension/src`. The generated `chrome-extension/dist` folder is ignored by git.
