import { Tree } from "@lezer/common";
import { RustSyntaxNodeDecor } from "./node";
import { RustSyntaxNodeVisitor } from "./visitor";
import { parser } from "@lezer/rust";

export class RustCallGraphTraversalClient {
  visitor: RustSyntaxNodeVisitor;
  tree: Tree;
  constructor(source: string, visitor?: RustSyntaxNodeVisitor) {
    const tree = parser.parse(source);

    if (visitor === undefined) {
      if (source === undefined) {
        throw new Error("Source is not provided");
      }
      this.visitor = new RustSyntaxNodeVisitor(source);
    } else {
      this.visitor = visitor;
    }
    this.tree = tree;
  }

  traverse(): Record<string, string> {
    let node = this.tree.topNode;

    // start with function items only
    const funcElems = node.getChildren("FunctionItem");
    const funcNodes = funcElems.map((funcEl) =>
      RustSyntaxNodeDecor.fromSyntaxNode(funcEl)
    );
    funcNodes.map((node) => node.accept(this.visitor));

    return this.visitor.result;
  }
}
