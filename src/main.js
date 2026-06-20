import { createApp } from "vue";
import VNetworkGraph from "v-network-graph";
import "v-network-graph/lib/style.css";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

// Vuetify
import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

// Icons
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";
import {
  mdiPackageVariantClosed,
  mdiHome,
  mdiFolderArrowDownOutline,
  mdiFolderArrowUpOutline,
  mdiFileSearchOutline,
  mdiArrowUDownLeft,
  mdiPackageVariantClosedPlus,
  mdiFileExportOutline,
  mdiPlus,
  mdiPlayPause,
  mdiTagEditOutline,
  mdiFormatHorizontalAlignLeft,
  mdiFormatHorizontalAlignRight,
  mdiChevronDown,
  mdiArrowULeftTop,
} from "@mdi/js";

// Swallow the benign "ResizeObserver loop" warning so the dev overlay doesn't
// flag it as a crash (capture phase runs before the overlay's handler).
window.addEventListener(
  "error",
  (e) => {
    if (e && e.message && e.message.indexOf("ResizeObserver loop") !== -1) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  },
  true,
);

// create Vuetify
const vuetify = createVuetify({
  theme: {
    defaultTheme: "light",
  },
  defaults: {
    VBtn: {
      variant: "outlined",
      density: "comfortable",
      size: "large",
      rounded: "lg",
    },
    VToolbar: {
      color: "grey-lighten-4",
      elevation: 6,
    },
    VToolbarItems: {
      variant: "text",
      color: "#00549f",
    },
    VListGroup: {
      color: "red",
    },
  },
  icons: {
    defaultSet: "mdi",
    aliases: {
      ...aliases,
      package: mdiPackageVariantClosed,
      home: mdiHome,
      folderArrowDown: mdiFolderArrowDownOutline,
      folderArrowUp: mdiFolderArrowUpOutline,
      fileSearch: mdiFileSearchOutline,
      arrowDownLeft: mdiArrowUDownLeft,
      packagePlus: mdiPackageVariantClosedPlus,
      fileExport: mdiFileExportOutline,
      plus: mdiPlus,
      playpause: mdiPlayPause,
      edit: mdiTagEditOutline,
      outLeft: mdiFormatHorizontalAlignLeft,
      outRight: mdiFormatHorizontalAlignRight,
      chevronDown: mdiChevronDown,
      undo: mdiArrowULeftTop,
    },
    sets: {
      mdi,
    },
  },
  components,
  directives,
});

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

createApp(App)
  .use(VNetworkGraph)
  .use(pinia)
  .use(store)
  .use(router)
  .use(vuetify)
  .mount("#app");
