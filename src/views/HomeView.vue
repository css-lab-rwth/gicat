<template>
  <v-main>
    <div class="page">
      <div class="split">
        <section class="identity">
          <img id="logo" src="../assets/icon.png" alt="GICAT logo" />
          <h1 id="header">GICAT</h1>
          <h4>General Isomorphic Code Analysis Tool</h4>
          <p>
            GICAT is a tool for extracting data from code repositories to
            display how its files, classes and modules are connected. The
            codebase is visualized in a graph that can be explored and analysed
            to understand the properties of code written in any programming
            language.
          </p>
          <p>
            Choose a repository folder in the Extractor, load pre-made filter
            packages or generate your own filters, and the structure is drawn
            for you.
          </p>
          <h6>Version {{ version }}</h6>
        </section>

        <figure>
          <div id="zoomContainer">
            <div class="zoom-inner" :style="{ transform: `scale(${scale})` }">
              <img id="zoomImage" src="../assets/gicat-views.svg" />
            </div>
          </div>
          <figcaption>
            Project structure of the official GICAT Repository.
          </figcaption>
        </figure>
      </div>

      <h6>&#169; 2026, CSS Lab RWTH Aachen University</h6>
    </div>
  </v-main>
</template>

<script setup>
import { ref, onMounted } from "vue";
import pack from "../../package.json";
const scale = ref(0.6);
const version = pack.version;

onMounted(() => {
  const zoomContainer = document.getElementById("zoomContainer");

  zoomContainer.addEventListener("wheel", function (e) {
    if (e.ctrlKey) {
      scale.value += e.deltaY * 0.01;
      scale.value = Math.min(Math.max(0.5, scale.value), 4);
    }
  });
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 90px);
}

.split {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rem;
  padding: 2rem;
  flex-wrap: wrap;
}

.identity {
  max-width: 30em;
}

#logo {
  width: 9em;
  height: auto;
  margin-bottom: 1rem;
}

#header {
  font-size: 3.4rem;
}

h4 {
  color: #073b44;
}

.identity p {
  margin-top: 1.5rem;
  line-height: 1.6;
}

.identity h6 {
  margin-top: 2rem;
  font-weight: normal;
}

#zoomContainer {
  width: 30em;
  height: 30em;
  overflow: auto;
  border: solid black;
  margin: 0 auto;
  border-radius: 1%;
}
.zoom-inner {
  width: 50em;
  height: 50em;
  transform-origin: top left;
  display: inline-block;
}
#zoomImage {
  width: 50em;
  height: 50em;
  display: block;
  max-width: none;
  max-height: none;
}

figcaption {
  margin-top: 0.6rem;
}

.page > h6 {
  padding: 1.5rem 0;
  font-weight: normal;
}
</style>
