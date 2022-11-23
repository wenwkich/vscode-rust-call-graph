import { RustSyntaxNodeDecor } from "./node";
import { NodeWithName } from "./state";
import { digraphEnd, digraphStart, funcDotStart, varDotStart } from "./utils";

export class GraphManager {
  funcNodes: Record<string, string[]> = {};
  varNodes: Record<string, string[]> = {};
  edges: Record<string, string[]> = {};

  stack: string[] = [];

  getFuncResult(funcName: string) {
    return `
${digraphStart}
  ${funcDotStart}\n
  ${this.funcNodes[funcName]?.join("\n") || ""}
  ${varDotStart}\n
  ${this.varNodes[funcName]?.join("\n") || ""}
  
  ${this.edges[funcName]?.join("\n") || ""}
${digraphEnd}
    `.trim();
  }

  get result() {
    return Object.keys(this.funcNodes).reduce(
      (prev, key) => ({ ...prev, [key]: this.getFuncResult(key) }),
      {}
    );
  }

  initializeFunction(funcName: string) {
    this.funcNodes[funcName] = [];
    this.varNodes[funcName] = [];
    this.edges[funcName] = [];
  }

  // TODO:
  addFuncNode(funcName: string, node: NodeWithName<RustSyntaxNodeDecor>) {
    this.funcNodes[funcName].push();
  }

  // TODO:
  addVarNode(funcName: string, node: NodeWithName<RustSyntaxNodeDecor>) {
    this.funcNodes[funcName].push();
  }

  addEdge(funcName: string, left: string, right: string, extraLabel?: string) {
    if (extraLabel) {
      this.edges[funcName].push(
        `${left} -> ${right} [ label="${extraLabel}" ]`
      );
    } else {
      this.edges[funcName].push(`${left} -> ${right}`);
    }
  }

  pushEdge(left: string, right: string, extraLabel?: string) {
    if (extraLabel) {
      this.stack.push(`${left} -> ${right} [ label="${extraLabel}" ]`);
    } else {
      this.stack.push(`${left} -> ${right}`);
    }
  }

  popAndAddEdges(funcName: string) {
    while (this.stack.length !== 0) {
      this.edges[funcName].push(this.stack.pop()!);
    }
  }
}
