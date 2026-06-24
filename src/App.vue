<template>
  <head>
    <!--<meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; img-src 'self' data:; media-src local-video:"
    />-->
  </head>
  <v-app>
    <v-app-bar elevation="4">
      <v-toolbar>
        <v-toolbar-items class="mx-auto">
          <a
            href="https://www.css-lab.rwth-aachen.de/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              alt="TST logo"
              src="../src/assets/rwth_tst_bild_rgb.png"
              id="tst"
            />
          </a>
          <router-link to="/">
            <v-btn prepend-icon="$home"></v-btn>
          </router-link>
          <router-link to="/options">
            <v-btn>Options</v-btn>
          </router-link>
          <router-link to="/extractor">
            <v-btn>Extractor</v-btn>
          </router-link>
          <router-link to="/filters">
            <v-btn>Filter</v-btn>
          </router-link>
          <router-link to="/license">
            <v-btn>License</v-btn>
          </router-link>
          <router-link to="/guide">
            <v-btn>Guide</v-btn>
          </router-link>
          <router-link to="/generator">
            <v-btn>Generator</v-btn>
          </router-link>
        </v-toolbar-items>
      </v-toolbar>
    </v-app-bar>
    <RouterView />
  </v-app>
</template>

<script>
export default {
  name: "GICAT",
  data() {
    return {
      appTitle: "GICAT",
      navBarItems: [
        { title: "", path: "/", icon: "$home" },
        { title: "Options", path: "/options" },
        { title: "Extractor", path: "/extractor" },
        { title: "Filter", path: "/filters" },
        { title: "License", path: "/license" },
        { title: "Guide", path: "/guide" },
        { title: "Generator", path: "/generator" },
      ],
    };
  },
};
</script>

<style lang="scss">
#tst {
  float: left;
  display: block;
  margin-top: 8px;
}

#app {
  text-align: center;
  font-family: Arial, sans-serif;
}

button {
  top: 30%;
}

h1,
h2,
h3 {
  letter-spacing: 1.5px;
  font-weight: lighter;
  text-align: center;
  color: #073b44;
}
</style>
