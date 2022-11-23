import {
  DefaultItemNode,
  ExpressionStatementNode,
  FunctionItemNode,
  LetDeclarationNode,
  RustSyntaxNodeDecor,
} from "./node";

export class RustSyntaxNodeVisitor {
  source: string | Buffer;
  stacks: Record<string, string[]> = {};
  // mapping of a function scope to variable set
  existingVar: Record<string, Record<string, RustSyntaxNodeDecor>> = {};
  debug: boolean;

  // TODO: set default debug to false;
  constructor(source: string | Buffer, debug = true) {
    this.source = source;
    this.debug = debug;
  }

  get result(): Record<string, string> {
    return {
      default: "",
    };
  }

  visitChildren(node: RustSyntaxNodeDecor) {
    const nodes = node.getChildren("Statement");
    nodes.map((node) => node.accept(this));
  }

  private visitParentUntilFindFunctionItem(
    node: RustSyntaxNodeDecor
  ): FunctionItemNode | null {
    const parent = node.parent;

    if (parent === null) {
      return null;
    }

    if (parent.name !== "FunctionItem") {
      return this.visitParentUntilFindFunctionItem(parent);
    } else {
      return parent as FunctionItemNode;
    }
  }

  private getNameFromFunctionItemNode(
    node: FunctionItemNode | LetDeclarationNode
  ) {
    const boundElem = node.getChild("BoundIdentifier");
    return this.source.slice(boundElem?.from, boundElem?.to).toString();
  }

  private log(msg: string | Buffer) {
    if (this.debug) {
      console.log(msg.toString());
    }
  }

  visitDefaultItemNode(node: DefaultItemNode) {
    this.visitChildren(node);
  }

  visitExpressionStatementNode(node: ExpressionStatementNode) {
    this.visitChildren(node);
  }

  visitFunctionItemNode(node: FunctionItemNode) {
    // initialize the stack
    const functionName = this.getNameFromFunctionItemNode(node);
    this.stacks[functionName] = [];
    this.existingVar[functionName] = {};
    const blockNode = node.getChild("Block");

    this.log(functionName);

    if (blockNode === null) {
      return;
    }

    this.visitChildren(blockNode);
  }

  visitLetDeclarationNode(node: LetDeclarationNode) {
    // todo
    const varName = this.getNameFromFunctionItemNode(node);

    const functionNode = this.visitParentUntilFindFunctionItem(node);
    if (functionNode !== null) {
      // push the variable to the function scope
      const functionName = this.getNameFromFunctionItemNode(functionNode);
      this.existingVar[functionName][varName] = node;
    }

    this.log(varName);

    this.visitChildren(node);
  }
}
