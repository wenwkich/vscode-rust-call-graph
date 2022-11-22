// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "vscode-call-graph.showCallGraph",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      const panel = vscode.window.createWebviewPanel(
        "callGraph", // Identifies the type of the webview. Used internally
        "Call Graph", // Title of the panel displayed to the user
        vscode.ViewColumn.Beside, // Editor column to show the new webview panel in.
        {
          enableScripts: true,
        }
      );

      panel.webview.html = getGraphContent("main", {
        main: "digraph { a -> b }",
      });
      console.log(panel.webview.html);
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

export function getGraphContent(graphId: string, dots: Record<string, string>) {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" 
      content="default-src 'none'; worker-src blob:; connect-src https://unpkg.com; script-src https://d3js.org https://unpkg.com https://cdn.jsdelivr.net 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval';">
    <title>Call Graph</title>
  </head>
  <body>
    <div id="app">
      {{graphId}}
      <div id="graph"></div>
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
        },
        mounted() {
          d3.select("#graph").graphviz().renderDot(this.dots[this.graphId]);
        },
      });
    </script>
  </body>
</html>
  `;
}
