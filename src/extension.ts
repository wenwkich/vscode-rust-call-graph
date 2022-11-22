// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { getWebviewContent } from "./view";

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

      panel.webview.html = getWebviewContent("main", {
        main: `digraph {
          node [ style="filled" ]
          a [ id="main" color="#FCECCB" ];
          b [ id="second" class="clicky" shape="plaintext" style="filled,rounded" color="#D5EDFF" ];
          c [ id="third" class="clicky" shape="plaintext" style="filled,rounded" color="#FCECCB" ];
          a -> b -> c;
        }`,
        second: `digraph {
          node [ style="filled" ]
          a [ id="main" color="#FCECCB" ];
          b [ id="second" class="clicky" shape="plaintext" style="filled,rounded" color="#D5EDFF" ];
          c [ id="third" class="clicky" shape="plaintext" style="filled,rounded" color="#FCECCB" ];
          b -> a -> c;
        }`,
        third: `digraph {
          node [ style="filled" ]
          a [ id="main" color="#FCECCB" ];
          b [ id="second" class="clicky" shape="plaintext" style="filled,rounded" color="#D5EDFF" ];
          c [ id="third" class="clicky" shape="plaintext" style="filled,rounded" color="#FCECCB" ];
          c -> b -> a;
        }`,
      });
      console.log(panel.webview.html);
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
