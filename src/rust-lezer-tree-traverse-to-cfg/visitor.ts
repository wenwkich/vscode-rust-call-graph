import { GraphManager } from "./graph";
import {
  BinaryExpressionNode,
  CallExpressionNode,
  DefaultExpressionNode,
  DefaultNode,
  DefaultStatementNode,
  ExpressionStatementNode,
  FunctionItemNode,
  IdentifierNode,
  IfExpressionNode,
  LetDeclarationNode,
  LiteralExpressionNode,
  RustSyntaxNodeDecor,
} from "./node";
import { InternalStateManager } from "./state";

export class RustSyntaxNodeVisitor {
  // source code
  source: string | Buffer;

  /** internal state */
  stateManager = new InternalStateManager<RustSyntaxNodeDecor>();

  /** graph state */
  graphManager = new GraphManager();

  // whether print internal var or not
  debug: boolean;

  // TODO: set default debug to false;
  constructor(source: string | Buffer, debug = true) {
    this.source = source;
    this.debug = debug;
  }

  /** DEFAULT NODES FALLBACK */
  visitDefaultStatementNode(node: DefaultStatementNode) {
    this.visitExpressionChildren(node);
  }

  visitDefaultExpressionNode(node: DefaultExpressionNode) {
    this.log("===== defaultExpressionNode");
    this.log(node.name);
    this.log(this.sliceSource(node));
    this.visitExpressionChildren(node);
    this.log("===== end defaultExpressionNode");
  }

  // do nothing
  visitDefaultNode(node: DefaultNode) {
    this.log("===== defaultNode");
    console.log(node.name);
    console.log(this.sliceSource(node));
    this.log("===== end defaultNode");
  }

  /** STATEMENTS */
  visitExpressionStatementNode(node: ExpressionStatementNode) {
    this.visitExpressionChildren(node);
  }

  visitFunctionItemNode(node: FunctionItemNode) {
    const funcName = this.getNameFromNode(node);

    // initialize block and existingVar
    const realFuncName = this.stateManager.initializeFunction(funcName, node);
    this.graphManager.initializeFunction(realFuncName);

    const blockNode = node.getChild("Block");
    if (blockNode === null) {
      return;
    }
    this.visitStatementChildren(blockNode);

    this.stateManager.popFunction();
  }

  visitLetDeclarationNode(node: LetDeclarationNode) {
    // todo
    let varName = this.getNameFromNode(node);

    // last item in the function stack is the current scope
    const counter = this.stateManager.incrementCounter(varName);

    if (counter !== 0) {
      varName += `_${counter}`;
    }

    // push it to the stack
    this.stateManager.pushToCurrentStack(varName, node);

    this.visitExpressionChildren(node);

    this.popAllAndDrawGraph();
  }

  // if a == 0 {
  //   statement_1;
  // } else if a = 1 {
  //   statement_2;
  // }

  // ["if a == 0", statement_1, ]
  // [a, "if a = 0"]

  // "if a == 0"-true-> statement 1
  // a->"if a = 0"
  // "if a = 0"-false->"if a = 1"

  /** EXPRESSIONS */
  visitIfExpressionNode(node: IfExpressionNode) {
    // todo
    const condition = node.getChild("Expression | LetDeclaration");
    // traverse the condition first
    condition?.accept(this);
    const blocks = node.getChildren("Block");
    blocks.map((block) => {
      this.visitStatementChildren(block);
    });
  }

  visitCallExpression(node: CallExpressionNode) {
    // todo
  }

  // a + b - c

  // [add, a, add, c, minus, add, minus c]

  visitBinaryExpression(node: BinaryExpressionNode) {
    // TODO:
    this.log("====== binary");
    this.visitExpressionChildren(node);
    this.log("====== end binary");
    // this.
    // this.mapExpressionChildren(node, (node) => {
    //   switch (node.name) {
    //     case "ArithOp":
    //     case "BitOp":
    //     case "CompareOp":
    //     case "LogicOp": {

    //       break;
    //     }
    //   }
    // });
  }

  visitIdentifierNode(node: IdentifierNode) {
    // TODO:
    this.log("==== identifier");
    this.log(this.sliceSource(node));
    this.stateManager.pushToCurrentStack(this.sliceSource(node), node);
    this.log("==== end identifier");
  }

  visitLiteralExpressionNode(node: LiteralExpressionNode) {
    this.log("==== literal");

    this.log(this.sliceSource(node));
    this.stateManager.pushToCurrentStack(this.sliceSource(node), node);
    this.log("==== end literal");
    // no more children to visit
  }

  get result() {
    return this.graphManager.result;
  }

  /** PRIVATE FUNCTIONS */
  private visitChildren(
    type: "Statement" | "Expression",
    node: RustSyntaxNodeDecor,
    before?: (node: RustSyntaxNodeDecor) => void,
    after?: (node: RustSyntaxNodeDecor) => void
  ) {
    const nodes = node.getChildren(type);
    nodes.map((node) => {
      before && before(node);
      node.accept(this);
      after && after(node);
    });
  }

  private visitStatementChildren(
    node: RustSyntaxNodeDecor,
    before?: (node: RustSyntaxNodeDecor) => void,
    after?: (node: RustSyntaxNodeDecor) => void
  ) {
    this.visitChildren("Statement", node, before, after);
  }

  private visitExpressionChildren(
    node: RustSyntaxNodeDecor,
    before?: (node: RustSyntaxNodeDecor) => void,
    after?: (node: RustSyntaxNodeDecor) => void
  ) {
    this.visitChildren("Expression", node, before, after);
  }

  private mapChildren(
    type: "Statement" | "Expression",
    node: RustSyntaxNodeDecor,
    mapFunc: (node: RustSyntaxNodeDecor) => void
  ) {
    const nodes = node.getChildren(type);
    nodes.map(mapFunc);
  }

  private mapStatementChildren(
    node: RustSyntaxNodeDecor,
    mapFunc: (node: RustSyntaxNodeDecor) => void
  ) {
    this.mapChildren("Statement", node, mapFunc);
  }

  private mapExpressionChildren(
    node: RustSyntaxNodeDecor,
    mapFunc: (node: RustSyntaxNodeDecor) => void
  ) {
    this.mapChildren("Expression", node, mapFunc);
  }

  private getNameFromNode(node: FunctionItemNode | LetDeclarationNode) {
    const boundElem = node.getChild("BoundIdentifier");
    return this.source.slice(boundElem?.from, boundElem?.to).toString();
  }

  private log(msg: string | Buffer) {
    if (this.debug) {
      console.log(msg.toString());
    }
  }

  private sliceSourceReplaced(node: RustSyntaxNodeDecor) {
    return this.sliceSource(node).replace(
      /<<|>>|&&|\|\||>=|<=|==|[\-_]|\s/g,
      (m) =>
        ({
          // eslint-disable-next-line @typescript-eslint/naming-convention
          "+": "_add_",
          // eslint-disable-next-line @typescript-eslint/naming-convention
          "-": "_sub_",
          // eslint-disable-next-line @typescript-eslint/naming-convention
          "*": "_mul_",
          // eslint-disable-next-line @typescript-eslint/naming-convention
          "/": "_div_",
          // eslint-disable-next-line @typescript-eslint/naming-convention
          "%": "_mod_",
          // eslint-disable-next-line @typescript-eslint/naming-convention
          "<<": "_left_shift_",
          // eslint-disable-next-line @typescript-eslint/naming-convention
          ">>": "_right_shift_",
          // eslint-disable-next-line @typescript-eslint/naming-convention
          "&&": "_and_",
          // eslint-disable-next-line @typescript-eslint/naming-convention
          "||": "_or_",
          // eslint-disable-next-line @typescript-eslint/naming-convention
          "|": "_bit_or_",
          // eslint-disable-next-line @typescript-eslint/naming-convention
          "&": "_bit_or_",
          // eslint-disable-next-line @typescript-eslint/naming-convention
          "^": "_bit_xor_",
          // eslint-disable-next-line @typescript-eslint/naming-convention
          ">=": "_geq_",
          // eslint-disable-next-line @typescript-eslint/naming-convention
          "<=": "_leq_",
          // eslint-disable-next-line @typescript-eslint/naming-convention
          "==": "_eq_",
          // eslint-disable-next-line @typescript-eslint/naming-convention
          "<": "_lt_",
          // eslint-disable-next-line @typescript-eslint/naming-convention
          ">": "_gt_",
        }[m] || "_")
    );
  }

  private sliceSource(node: RustSyntaxNodeDecor) {
    return this.source.slice(node.from, node.to).toString();
  }

  /** draw graph from stack */
  private popAllAndDrawGraph() {
    const stackLen = this.stateManager.getCurrentStackLength();
    // if (stackLen % 2 !== 0) {
    //   throw new Error("Stack Length is not even");
    // }

    while (!this.stateManager.isCurrentStackEmpty()) {
      const left = this.stateManager.popFromCurrentStack();
      const right = this.stateManager.popFromCurrentStack();
      left && right && this.graphManager.pushEdge(left.name, right.name);
    }
    // this is to make sure the order is reversed
    this.graphManager.popAndAddEdges(
      this.stateManager.peekCurrentFunctionName()
    );
  }

  private popAndDrawGraph() {
    const stackLen = this.stateManager.getCurrentStackLength();
    // if (stackLen % 2 !== 0) {
    //   throw new Error("Stack Length is not even");
    // }

    const left = this.stateManager.popFromCurrentStack();
    const right = this.stateManager.popFromCurrentStack();
    left &&
      right &&
      this.graphManager.addEdge(
        this.stateManager.peekCurrentFunctionName(),
        left.name,
        right.name
      );
  }
}
