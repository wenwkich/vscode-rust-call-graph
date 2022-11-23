// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { getWebviewContent } from "./view";
import { parser as rustParser } from "@lezer/rust";
import { parser as pyParser } from "@lezer/python";
import { parser as jsParser } from "@lezer/javascript";
import { RustCallGraphTraversalClient } from "./rust-lezer-tree-traverse-to-cfg";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "vscode-call-graph.showCallGraph",
    () => {
      const document = vscode.window.activeTextEditor?.document;
      const languageId = document?.languageId;
      const source = document?.getText();

      if (source === undefined) {
        vscode.window.showInformationMessage("No Source Files");
        return;
      }

      let dots: Record<string, string>;
      switch (languageId) {
        case "rust": {
          const tree = rustParser.parse(source);
          dots = new RustCallGraphTraversalClient(tree, source).traverse();
          break;
        }
        // case "python": {
        //   tree = pyParser.parse(source);
        //   break;
        // }
        // case "javascript": {
        //   tree = jsParser.parse(source);
        //   break;
        // }
        default: {
          vscode.window.showInformationMessage(
            "Language not supported, supported language: rust, python and javascript"
          );
          return;
        }
      }

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

      panel.webview.html = getWebviewContent("default", dots);
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
