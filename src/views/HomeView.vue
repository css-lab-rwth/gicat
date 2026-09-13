<template>
  <v-main>
    <div class="home">
      <h1 id="header">GICAT</h1>
      <h4>General Isomorphic Code Analysis Tool</h4>
      <h6>{{ version }}</h6>
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
    <br />
    <br />
    <h6>&#169; 2026, CSS Lab RWTH Aachen University</h6>
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
</style>
