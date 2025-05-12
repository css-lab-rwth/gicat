<template>
  <v-main>
    <div class="guide"></div>
    <br />
    <v-btn id="browserButton" @click="openNewWindow()">OPEN IN BROWSER</v-btn>
    <div class="motivation">
      <br />
      <h1>Motivation</h1>
      <p>
        The analysis of a program is quite complex. This is due to the large
        amount of different programming languages but also the possibility to
        run a code analysis from multiple points of view such as inheritance,
        refactoring, method signatures, comments, class growth etc. Current code
        documentation tools mostly focus on helping the process of
        implementation which is why most of the named analysis methods are not
        supported sufficiently.
      </p>
      <br />
      <p>
        Another problem is the circumstance of outdated code which is not
        compatible with modern documentation tools. To address those issues, our
        tool provides you with the functionality to generate your own filter
        files based on regular expressions (<b>Regex</b>) which will be
        generated from from a given code snippet. Those filter files can then be
        used to analyze a given source code by its rules. Thereby, the
        programming language and the specific type of the analysis process is
        left open to the users decisions.
      </p>
      <br />
      <p>
        In the following, we are going to provide a short use case showing how
        our tool can be utilized in different ways to analyze a programs source
        code followed by a walk-through on how to generate the mentioned
        filters. All examples are applied to the source code of
        <a href="https://gitlab.obspm.fr/dmaschmann/xgaltool" target="_blank">
          xgaltool</a
        >
        using our basic filter package for python which can be found
        <a
          href="https://github.com/davh-hub/gicat-filter-collection"
          target="_blank"
          >here
        </a>
        .
      </p>
      <br />
    </div>
    <br />
    <div class="use case">
      <h1>Use case</h1>
      <p>
        Xgaltool is a program from computational astrophysics. It analyzes data
        of the Reference Catalog of galaxy Spectral Energy Distributions (RCSED)
        in search of a specific kind of galaxy (merging galaxies). Those
        galaxies are suspected to be the star cradles of the universe (i.e. they
        are associated with a high star formation rate).
      </p>
      <br />
      <p>
        As our first example, we will take a look at two different versions of
        the previously mentioned xgaltool, introducing the main idea of filter
        packages in GICAT. A filter package can contain two different types of
        filters (node and edge filters). We applied our python class
        <b>node filter</b> from our basic python filter package onto two
        different snapshots of the xgaltool's source code. You can double click
        onto rectangular nodes to collapse/reveal all of its outgoing edges and
        left click rounded nodes to highlight them and their edges. Using your
        mousewheel allows you to zoom in/out of the visualization and holding
        down the left mouse button lets you move around. By doing so, one can
        adjust the visualization to their likings and export the emerging graph
        as a svg file.
      </p>
      <br />
      <p>
        As you can see in Figure 1.1 and Figure 1.2, the project structure
        changed at several places between June 2021 and June 2023. For example,
        the class AnalysisTools is non-existent in the later version of the tool
        thus some classes in the new version are missing some of the older
        versions dependencies.
      </p>
      <br />
      <div class="images">
        <figure>
          <img
            src="../assets/xgaltool_old.svg"
            alt="Figure 1.1 old code base"
            height="70%"
            width="70%"
          />
          <figcaption>
            Fig.1.1 - GICAT view on xgaltool of June 10th 2021
          </figcaption>
        </figure>
        <br />
        <figure>
          <img
            src="../assets/xgaltool_new.svg"
            alt="Figure 1.2 new code base"
            height="70%"
            width="70%"
          />
          <figcaption>
            Fig.1.2 - GICAT view on xgaltool of June 19th 2023
          </figcaption>
        </figure>
      </div>
      <br />
      <div class="use case">
        <p>
          After getting an overview of the whole project, you can go deeper into
          the fine structure of the code to identify concepts that are relevant
          to your analysis, to learn how they are realized in the code and how
          they are related to each other.
        </p>
        <br />
        <p>
          For this, the use of <b>edge filters</b> is strongly recommended.
          Figure 2.1 applies this to our example. Most of the information in
          astrophysics depends on spectral analysis - the information the
          astrophysicist seeks is encoded in the light the telescope catches.
        </p>
        <br />
        <p>
          In our example, the main target of observation are spread reflections
          of light in space - gases. With the python class node filter we can
          easily identify the relevant class: AnalyseGas. Combining the
          class-node filter with our python class-edge filter lets pop up an
          <b>extends</b> attribute an edge if the target node inherits from its
          source.
        </p>
        <br />
        <p>
          In this case we see that our class AnalyseGas inherits from the
          classes SFRTools and EmissionLineTools. SFR means 'star formation
          rate' while an 'emission line' is a concept employed in spectral
          analysis. Roughly spoken, the galaxies that Xgaltool searches for
          (merging galaxies) exhibit a specific kind of emission line (those
          that show a double peak) that can be computed from the RCSED. We have
          now found out that the search for specific emission lines
          (EmissionLineTools) in the context of the general task of a spectral
          analysis (AnalyseGas) is linked to the information about the star
          formation rate (SFRTools) and how this relationship is realized in the
          code.
        </p>
        <br />
      </div>
      <br />
      <figure>
        <img
          src="../assets/class_extension.png"
          alt="Figure 2.1"
          height="50%"
          width="50%"
        />
        <figcaption>
          Figure 2.1 analysis_tools class after edge and node filter application
        </figcaption>
      </figure>
      <br />
      <p>
        For even further investigation into the source codes nature, you can
        double click any node to open the corresponding file with your Code
        Editor of choice which can be set in the <b>Options</b> page. We
        recommend using Window's free Code Editor
        <a href="https://code.visualstudio.com/" target="_blank">
          Visual Studio Code</a
        >
        because our features have been tested and implemented to work with it.
        We cannot guarantee correct functioning with other editors. Of course,
        this interaction can be applied to different edge-node-filters for
        different outcomes. Help in creating your own filter files in the
        <b>Filter Generation</b>
        section of the guide.
        <br />
        You can also export the rendered graph as a scalable vector graphic
        (.svg) file and edit it with a vector graphic editor, such as
        <a href="https://inkscape.org/" target="_blank">Inkscape</a>.
      </p>
      <br />
    </div>
    <br />
    <h1>Filter Generation</h1>
    <p>
      Our tool uses
      <a
        href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions"
        target="_blank"
        >regular expressions
      </a>
      (Regex) to filter parts of the code and render those as nodes or edges.
      For that purpose, we have implemented a <b>Regex generator</b> to assist
      you in generating a syntactical correct regular expression.<br />
      A regular expression is a string of characters that fulfils certain
      criteria. When applied to text search (in our case program code), the
      regular expression filters the text and finds all patterns matching the
      criteria.<br />
    </p>
    <br />
    <p>
      Once you have opened the Generator tab, you will see that it is divided
      into three sections and two parts. The main part consists of the section
      <b>Package information</b> in which you can set the underlying information
      of your generated filter package. Please remember, that you cannot export
      your filter package file unless you have clicked the
      <b>Generate Package</b> button which will initialize your filter package.
      The <b>Node filter</b> section lets you generate one or multiple node
      filters and the section <b>Edge filter</b> does so likewise for edge
      filters. The Package Explorer window shows all the information about your
      filter package as you are working on it. This is helpful for keeping track
      of your current work.
    </p>
    <br />
    <h3>Node filter</h3>
    <p>
      The first part of the Node filter is all about generating a Regex from a
      given code snippet. To start generating your Regex, all you need to do is
      copy and paste a sample code snippet from your source code. This is done
      as follows:<br />
    </p>
    <br />
    <p>
      From left to right, select the part of the source code from which you wish
      to generate a (partial) regular expression. To assist you in that, we
      offer a list of predetermined commonly used rulesets. By highlighting a
      certain part of your code snippet and selecting an option from our
      predetermined list, a valid regular expression will be generated. This can
      be done optionally with the capture group check mark and/or a
      <b>quantifier</b>.
    </p>
    <br />
    <p>
      A quantifier allows you to set a range of occurrences for the preceding
      expression. Therefore you can choose from different ranges:<br /><br />
    </p>
    <br />
    <div id="list">
      <ul>
        <li>
          <i>{min,max}</i> for at least <i>min</i> and at most
          <i>max</i> occurrences
        </li>
        <li><i>{n}</i> for exactly <i>n</i> occurrences</li>
        <li>
          <i>?</i> for none or one occurrence (equivalent to <i>{0,1}</i>)
        </li>
        <li>
          <i>+</i> for at least one occurrence (equivalent to <i>{1, }</i>)
        </li>
        <li>
          <i>*</i> for any number of occurrences (equivalent to <i>{0, }</i>)
        </li>
        <li>
          using none quantifier at all matches the default <i>{1}</i>
          quantifier.
        </li>
      </ul>
    </div>
    <br />
    <p>
      To clarify, in the video below we provide a complete rundown of generating
      a Python class-extension filter Regex from a code snippet. You can of
      course also use your own Regex by inserting it manually to the generated
      .json filter file.
    </p>
    <br />
    <video width="600px" height="400px" controls>
      <source src="local-video://regex_generation_example.mp4" />
    </video>
    <br />
    <br />
    <p>
      In the Node filter generator, you have also the option to
      <b>Assign capture group</b>. As the name suggests, a capture group lets
      you capture text patterns matching the ruleset within the round brackets.
      They can be regarded as a container for similar code patterns. We use this
      feature to draw edges between two nodes (in this case between two named
      capture groups).
    </p>
    <br />
    <p>
      Therefore, it is mandatory to name each of your specified capture groups
      by filling out the <i>Capture group name</i> field. To assign a named
      capture group to an actual capture group in your Regex, simply write down
      its index inside the <i>Set capture groups</i> field (starting at 1 from
      left to right). It is possible to assign multiple capture groups to one
      named capture group by separating them with a comma. Remember to always
      click the <b>ADD</b> button include your changes into the filter before
      continuing with another named capture group.
    </p>
    <br />
    <p>
      As an example of adding a capture group, we will use the previously
      generated Regex:
      <br /><br />
      <code>class\s<b>([A-Za-z]+)</b>\\(<b>(.*)</b>\\)\\:</code>
      <br />
    </p>
    <br />
    <p>
      The first capture group with index 1 will collect all terms inside your
      program code matching the <i>[A-Za-z]+</i> pattern (this ruleset equals to
      any positive number of upper or lower case letters) with a preceding
      <i>class </i> term. Thus, it will collect all class-names. The second
      capture group (matching any number of any character, except line breaks)
      with index 2 will then collect all class-names of those classes the
      associated class in capture group 1 inherits from. Please remember that
      this is just an example for the Python programming language. Your regular
      expression and capture groups may differ according to your programming
      language's syntax.
    </p>
    <br />
    <p>
      After you have successfully generated a Regex, our tool will give you the
      opportunity to provide some additional information about your filter
      package. These include a Node labe, which will be shown as a Prefix inside
      the node, as seen in Figure 2.1. You can also exclude a Regex, which will
      ignore code patterns in the rendering process matching its Regex. It is
      important to name and set your previously generated capture groups
      correctly.
    </p>
    <br />
    <p>
      Figures 3.1 and 3.2 show the assignment of both of our determined capture
      groups in the same way we used it to create our basic Python filter
      package by naming our first capture group <i>className</i> and our second
      group <i>extends</i>.
    </p>
    <br />
    <p>
      Finally, you can select a <b>Label attribute</b> and the color for the
      rendered nodes. You have the option to choose from your previous assigned
      capture groups what information (captured by your capture groups) is
      shown. The label of a rendered node will be displayed in the form
      <b>node label:label attribute</b>.
    </p>
    <br />
    <figure>
      <img
        src="../assets/capture_1.jpg"
        alt="Figure 3.1"
        height="70%"
        width="70%"
      />
      <figcaption>
        Figure 3.1 - assignment of the first capture group
      </figcaption>
    </figure>
    <br />
    <figure>
      <img
        src="../assets/capture_2.jpg"
        alt="Figure 3.2"
        height="70%"
        width="70%"
      />
      <figcaption>
        Figure 3.2 - assignment of the second capture group
      </figcaption>
    </figure>
    <br />
    <h3>Edge filter</h3>
    <p>
      A Node Filter on its own is enough to render a graph, but to represent
      additional information, you can also add an Edge filter by choosing source
      and target attributes as shown in Figure 4.1 to draw custom edges.
    </p>
    <br />
    <p>
      First, you will have to provide the name of the Edge filter. This name
      will later be shown in a drop down menu when visiting the Extractor page.
      We recommend naming those in a comprehensive way so you can later
      distinguish between Edge and Node filter.You can then decide if you want
      to allow loops. The edge filters generate directed edges between nodes. As
      mentioned previously, those nodes will represent the matching text found
      through their respective capture groups. To generate edge filters, you
      first need to select the respective source node filter from your package
      you wish to draw edges from.
    </p>
    <br />
    <p>
      After that, you need to select one of its previously declared capture
      groups as a source attribute. All of the nodes matched by this capture
      group will then be treated as the source nodes of your future edges. You
      will then have to select the target node filter. In this case, we are
      using the same node filter as source and target since our aim is to draw
      labeled edges between sub classes and their super class. Both of those
      capture groups are part of our previously generated
      <i>Class Filter Python</i>. You can also draw edges between two different
      node filters inside the <i>same package</i>.
    </p>
    <br />
    <figure>
      <img src="../assets/edgefilter.jpg" alt="Figure 4.1" />
      <figcaption>Figure 4.1 - Edge filter</figcaption>
    </figure>
    <br />
    <p>
      At last, you will have the opportunity to add some additional information
      to your new edges. In our example, we want to label all edges generated by
      this Edge filter with the key word <i>extends</i> to visualize the
      dependence of a sub class to their respective super class. (Figure 4.2)
    </p>
    <br />
    <figure>
      <img src="../assets/edge_filter_meta.jpg" alt="Figure 4.2" />
      <figcaption>Figure 4.2 - Edge filter label and color</figcaption>
    </figure>
    <br />
    <p>
      Figure 4.3 and 4.4 shows our recently generated Edge filter in action. We
      therefore activated only our previously generated Python Class Filter as
      seen in figure 4.3. As shown in figure 4.4, you will see what it looks
      like if you activate the Edge filter.
    </p>
    <br />
    <figure>
      <img
        src="../assets/no-edge-filter-applied.png"
        alt="Figure 4.3"
        height="70%"
        width="70%"
      />
      <figcaption>Figure 4.3 - Edge filter inactive</figcaption>
    </figure>
    <br />
    <figure>
      <img
        src="../assets/edge-filter-applied.png"
        alt="Figure 4.4"
        height="70%"
        width="70%"
      />
      <figcaption>Figure 4.4 - Edge filter active</figcaption>
    </figure>
  </v-main>
</template>
<script>
export default {
  data() {
    return {};
  },
  name: "GuideView",
  components: {},
  methods: {
    openNewWindow() {
      window.open("https://www.css-lab.rwth-aachen.de/tools/overview");
    },
  },
};
</script>
<style scoped>
h2 {
  text-align: left;
  margin-left: 45px;
  margin-right: 45px;
}

ul {
  text-align: left;
}

h3 {
  font-size: 25px;
}

a {
  color: #42b983;
}

video {
  box-shadow: 2px 2px 5px 5px;
  margin-top: 10px;
}

#list {
  margin-left: 33%;
  margin-right: 33%;
  list-style-position: outside;
}

p {
  margin-left: 15%;
  margin-right: 15%;
  text-align: left;
}

button {
  top: 0;
}
</style>
