import { SyntaxNode } from "@lezer/common";
import { RustSyntaxNodeVisitor } from "./visitor";

export interface RustSyntaxNodeDecor {
  accept(v: RustSyntaxNodeVisitor): any;
}

export abstract class RustSyntaxNodeDecor implements RustSyntaxNodeDecor {
  node: SyntaxNode;

  constructor(node: SyntaxNode) {
    this.node = node;
  }

  static fromSyntaxNode(node: SyntaxNode): RustSyntaxNodeDecor {
    switch (node.name) {
      case "FunctionItem": {
        return new FunctionItemNode(node);
      }
      case "ExpressionStatement": {
        return new ExpressionStatementNode(node);
      }
      case "LetDeclaration": {
        return new LetDeclarationNode(node);
      }
      default: {
        return new DefaultItemNode(node);
      }
    }
  }

  getChild(
    type: string | number,
    before?: string | number | null | undefined,
    after?: string | number | null | undefined
  ): RustSyntaxNodeDecor | null {
    const child = this.node.getChild(type, before, after);
    if (child === null) {
      return null;
    }
    return RustSyntaxNodeDecor.fromSyntaxNode(child);
  }

  getChildren(
    type: string | number,
    before?: string | number | null | undefined,
    after?: string | number | null | undefined
  ): RustSyntaxNodeDecor[] {
    const children = this.node.getChildren(type, before, after);
    return children.map((child) => RustSyntaxNodeDecor.fromSyntaxNode(child));
  }

  get parent(): RustSyntaxNodeDecor | null {
    if (this.node.parent === null) {
      return null;
    }
    return RustSyntaxNodeDecor.fromSyntaxNode(this.node.parent);
  }

  get from() {
    return this.node.from;
  }

  get to() {
    return this.node.to;
  }

  get name() {
    return this.node.name;
  }

  get type() {
    return this.node.type;
  }
}

export class DefaultItemNode extends RustSyntaxNodeDecor {
  accept(v: RustSyntaxNodeVisitor) {
    v.visitDefaultItemNode(this);
  }
}

export class FunctionItemNode extends RustSyntaxNodeDecor {
  accept(v: RustSyntaxNodeVisitor) {
    v.visitFunctionItemNode(this);
  }
}

export class LetDeclarationNode extends RustSyntaxNodeDecor {
  accept(v: RustSyntaxNodeVisitor) {
    v.visitLetDeclarationNode(this);
  }
}

export class ExpressionStatementNode extends RustSyntaxNodeDecor {
  accept(v: RustSyntaxNodeVisitor) {
    v.visitExpressionStatementNode(this);
  }
}
