# GICAT


⚠️ Linux users - please read
On Linux, GICAT currently needs to run without the Chromium sandbox. If the AppImage doesn't launch (or you see a sandbox error), start it with the --no-sandbox flag:

```
chmod +x GICAT-1.1.0.AppImage
./GICAT-1.1.0.AppImage --no-sandbox
```
Why: some features (project scanning and "open file in editor") use Node APIs directly in the renderer, which isn't sandbox-compatible yet. Windows and macOS are unaffected.

This is a known limitation - a fix is planned for an upcoming release (moving that logic to the main process via IPC) so Linux can run fully sandboxed without the flag. Thanks for your patience! 



## Filter collection

GICAT extracts nodes and edges using filters: small JSON files holding a regular
expression, the file extension it applies to, and the attributes to capture. The
companion filter collection ships ready-made packages covering Python, R, Java,
C, C++, C#, Fortran 77/90, Lean, OCaml, Scala and SML.

- Collection: https://github.com/css-lab-rwth/gicat-filter-collection

To use one, open the **Generator** page and import the package file, or load the
individual filters from the **Filter** page. Nothing needs to be installed or
compiled — a filter is data, not code.

To support a language that is not covered yet, write a single JSON file. The
Generator builds one for you from a pasted code snippet, so no familiarity with
the file format is required.

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
