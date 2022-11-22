export function getWebviewContent(
  graphId: string,
  dots: Record<string, string>
) {
  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta
        http-equiv="Content-Security-Policy"
        content="default-src 'none'; worker-src blob:; style-src 'unsafe-inline'; connect-src https://unpkg.com; script-src https://d3js.org https://unpkg.com https://cdn.jsdelivr.net 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval';"
      />
      <title>Call Graph</title>
    </head>
    <body>
      <div id="app">
        <button v-on:click="handleBack">Back</button>
        <div id="graph" style="width: 100%; height: 100vh"></div>
      </div>
  
      <script src="https://d3js.org/d3.v5.min.js"></script>
      <script src="https://unpkg.com/@hpcc-js/wasm@0.3.11/dist/index.min.js"></script>
      <script src="https://unpkg.com/d3-graphviz@3.0.5/build/d3-graphviz.js"></script>
      <script
        src="https://unpkg.com/@hpcc-js/wasm@2.1.1/dist/index.js"
        type="application/javascript"
      ></script>
      <script src="https://cdn.jsdelivr.net/npm/vue@2.7.13"></script>
      <script>
        let app = new Vue({
          el: "#app",
          data: {
            dots: ${JSON.stringify(dots)},
            graphId: "${graphId}",
            graphIdStack: [],
            graphviz: null,
          },
          mounted() {
            this.graphviz = this.initGraph();
            this.graphviz.on("initEnd", this.renderGraph);
          },
          methods: {
            initGraph() {
              return d3
                .select("#graph")
                .graphviz()
                .transition(function () {
                  return d3
                    .transition("main")
                    .ease(d3.easeLinear)
                    .delay(100)
                    .duration(500);
                });
            },
            renderGraph() {
              this.graphviz.renderDot(this.dots[this.graphId]);
              this.graphviz.on("end", this.renderClicky);
            },
            renderClicky() {
              var clicky = d3.selectAll(".clicky");
              clicky.style("cursor", "pointer");
              clicky.on("click", this.handleClick);
            },
            handleClick(evt) {
              this.graphIdStack.push(this.graphId);
              this.graphId = evt.attributes.id;
              this.renderGraph();
            },
            handleBack(evt) {
              if (this.graphIdStack.length == 0) {
                return;
              }
              let lastGraphId = this.graphIdStack.pop();
              this.graphId = lastGraphId;
              this.renderGraph();
            },
          },
        });
      </script>
    </body>
  </html>
  `;
}
