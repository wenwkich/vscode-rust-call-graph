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
      case "IfExpression": {
        return new IfExpressionNode(node);
      }
      case "Identifier": {
        return new IdentifierNode(node);
      }
      case "BinaryExpression": {
        return new BinaryExpressionNode(node);
      }
      case "String":
      case "RawString":
      case "Char":
      case "boolean":
      case "Integer":
      case "Float": {
        return new LiteralExpressionNode(node);
      }
      // Fallback
      default: {
        if (node.type.is("Statement")) {
          return new DefaultStatementNode(node);
        } else if (node.type.is("Expression")) {
          return new DefaultExpressionNode(node);
        } else {
          return new DefaultNode(node);
        }
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

  get cursor() {
    return this.node.cursor();
  }
}

export class DefaultStatementNode extends RustSyntaxNodeDecor {
  accept(v: RustSyntaxNodeVisitor) {
    v.visitDefaultStatementNode(this);
  }
}

export class DefaultExpressionNode extends RustSyntaxNodeDecor {
  accept(v: RustSyntaxNodeVisitor) {
    v.visitDefaultExpressionNode(this);
  }
}

export class DefaultNode extends RustSyntaxNodeDecor {
  accept(v: RustSyntaxNodeVisitor) {
    v.visitDefaultNode(this);
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

export class IfExpressionNode extends RustSyntaxNodeDecor {
  accept(v: RustSyntaxNodeVisitor) {
    v.visitIfExpressionNode(this);
  }
}

export class CallExpressionNode extends RustSyntaxNodeDecor {
  accept(v: RustSyntaxNodeVisitor) {
    v.visitCallExpressionNode(this);
  }
}

export class AssignmentExpressionNode extends RustSyntaxNodeDecor {
  accept(v: RustSyntaxNodeVisitor) {
    v.visitAssignmentExpressionNode(this);
  }
}

export class BinaryExpressionNode extends RustSyntaxNodeDecor {
  accept(v: RustSyntaxNodeVisitor) {
    v.visitBinaryExpression(this);
  }
}

export class LiteralExpressionNode extends RustSyntaxNodeDecor {
  accept(v: RustSyntaxNodeVisitor) {
    v.visitLiteralExpressionNode(this);
  }
}

export class IdentifierNode extends RustSyntaxNodeDecor {
  accept(v: RustSyntaxNodeVisitor) {
    v.visitIdentifierNode(this);
  }
}
