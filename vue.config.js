const { defineConfig } = require("@vue/cli-service");
module.exports = defineConfig({
  lintOnSave: false, //TODO: ONLY TEMPORARY
  transpileDependencies: true,
  devServer: {
    client: {
      overlay: {
        // ignore the benign "ResizeObserver loop" warning in the dev overlay
        runtimeErrors: (error) =>
          !(
            error &&
            error.message &&
            error.message.includes("ResizeObserver loop")
          ),
      },
    },
  },
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: "public/preload.js",
      builderOptions: {
        win: {
          target: ["nsis"],
          icon: "build/icon.png",
        },
        nsis: {
          allowToChangeInstallationDirectory: true,
          createStartMenuShortcut: false,
          deleteAppDataOnUninstall: true,
          uninstallDisplayName: "GICAT-Uninstaller",
          license: "license.md",
          menuCategory: true,
          oneClick: false,
        },
        mac: {
          darkModeSupport: true,
          target: ["dmg"],
        },
        linux: {
          target: ["appImage"],
        },
        appImage: {
          license: "license.md",
        },
        dmg: {},
      },
    },
  },
});
