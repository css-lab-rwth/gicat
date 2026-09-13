<template>
  <v-main>
    <div class="page">
      <div class="split">
        <!-- identity + what the tool is for -->
        <section class="pane-left">
          <div class="identity">
            <img id="logo" src="../assets/icon.png" alt="GICAT logo" />
            <h1 id="header">GICAT</h1>
            <h4>General Isomorphic Code Analysis Tool</h4>
            <div class="rule"></div>

            <p class="lead">
              GICAT is a tool for extracting data from code repositories to
              display how its files, classes and modules are connected. The
              codebase is visualized in a graph that can be explored and
              analysed to understand the properties of code written in any
              programming language.
            </p>
            <p class="lead">
              Choose a repository folder in the Extractor, load pre-made filter
              packages or generate your own filters, and the structure is drawn
              for you.
            </p>

            <h6 id="version">Version {{ version }}</h6>
          </div>
        </section>

        <!-- project structure -->
        <section class="pane-right">
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
        </section>
      </div>

      <h6 id="copyright">&#169; 2026, CSS Lab RWTH Aachen University</h6>
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

/* One centred composition rather than two halves pinned to opposite edges of
   the window. */
.split {
  flex: 1;
  display: flex;
  gap: clamp(2rem, 5vw, 5rem);
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 clamp(1.5rem, 4vw, 3rem);
}

/* ---------- left ---------- */
.pane-left {
  flex: 1 1 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 3rem 0;
  min-width: 0;
}

.identity {
  max-width: 34rem;
  margin: 0 auto;
}

/* The logo and the two title rows sit centred in the column; the body copy
   below stays left aligned so it remains comfortable to read. */
#logo,
.identity h1,
.identity h4 {
  text-align: center;
}

.identity p {
  text-align: left;
}

#logo {
  width: 9em;
  height: auto;
  display: block;
  margin: 0 auto 1.4rem;
}

#header {
  font-size: 3.4rem;
  line-height: 1.1;
  margin-bottom: 0.2rem;
}

.identity h4 {
  color: #073b44;
}

/* Belongs to the centred title group above it, so it centres too. */
.rule {
  width: 3.5rem;
  height: 3px;
  background: #073b44;
  border-radius: 2px;
  margin: 1.4rem auto 1.6rem;
  opacity: 0.5;
}

.lead {
  line-height: 1.65;
  color: #5f7183;
  margin-bottom: 0.9rem;
  max-width: 46ch;
}

#version {
  margin-top: 2rem;
  color: #8296a6;
  font-weight: normal;
  letter-spacing: 0.04em;
  text-align: center;
}

/* ---------- right ---------- */
.pane-right {
  flex: 1 1 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
  min-width: 0;
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
  text-align: center;
}

/* ---------- footer ---------- */
#copyright {
  margin-top: auto;
  padding: 1.5rem 0;
  color: #8296a6;
  font-weight: normal;
  text-align: center;
}

/* ---------- narrow windows ---------- */
@media (max-width: 900px) {
  .split {
    flex-direction: column;
  }
  .pane-left {
    flex: none;
    padding: 2.5rem 0 1rem;
  }
  .identity {
    max-width: none;
  }
  #header {
    font-size: 2.6rem;
  }
  .pane-right {
    flex: none;
    padding: 0 0 2.5rem;
  }
  #zoomContainer {
    max-width: 100%;
  }
}
</style>
