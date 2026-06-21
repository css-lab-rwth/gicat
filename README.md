# GICAT


⚠️ Linux users - please read
On Linux, GICAT currently needs to run without the Chromium sandbox. If the AppImage doesn't launch (or you see a sandbox error), start it with the --no-sandbox flag:

```
chmod +x GICAT-1.1.0.AppImage
./GICAT-1.1.0.AppImage --no-sandbox
```
Why: some features (project scanning and "open file in editor") use Node APIs directly in the renderer, which isn't sandbox-compatible yet. Windows and macOS are unaffected.

This is a known limitation - a fix is planned for an upcoming release (moving that logic to the main process via IPC) so Linux can run fully sandboxed without the flag. Thanks for your patience! 



## Project setup

Install yarn through npm:

```
npm install -g yarn
```

## Run in project folder

```
yarn
```

### Compiles and hot-reloads for development

```
yarn electron:serve
```

### Compiles and minifies for production

```
yarn electron:build
```

### Compile JSDoc

```
yarn docs
```
