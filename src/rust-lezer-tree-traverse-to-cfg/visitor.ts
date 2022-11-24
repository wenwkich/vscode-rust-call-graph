import { GraphManager } from "./graph";
import {
  AssignmentExpressionNode,
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
    this.visitExpressionChildren(node);
  }

  // do nothing
  visitDefaultNode(node: DefaultNode) {}

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
    let varNames = this.getBoundIdentifiersFromNode(node);

    this.visitExpressionChildren(node);

    this.popAllAndDrawGraph();
    const lastItem = this.stateManager.popFromCurrentStack();
    const funcName = this.stateManager.peekCurrentFunctionName();

    varNames.map((varName) => {
      const counter = this.stateManager.incrementCounter(varName);

      if (counter !== 0) {
        varName += `_${counter}`;
      }

      // TODO: add node to graph

      // connect the last item with variables
      if (lastItem) {
        this.graphManager.addEdge(funcName, lastItem.name, varName);
      }
    });
  }

  /** EXPRESSIONS */
  visitIfExpressionNode(node: IfExpressionNode) {
    // TODO: add nodes
    this.stateManager.pushToCurrentStack("if", node);

    // traverse the condition first
    const expression = node.getChild("Expression");
    const letStatement = node.getChild("LetDeclaration");

    const funcName = this.stateManager.peekCurrentFunctionName();

    const cond = expression || letStatement;
    const condName = cond !== null ? this.sliceSourceReplaced(cond) : "";
    // TODO: add mode for full statement
    cond?.accept(this);
    const lastElems = this.stateManager.popAllFromCurrentStack();
    // TODO: remember to add nodes
    lastElems.map((elem) => {
      this.graphManager.addEdge(funcName, elem!.name, condName);
    });

    const blocks = node.getChildren("Block");
    // if block
    if (blocks.length >= 1) {
      const ifBlock = blocks[0];

      const blockName = condName + "_then";
      // TODO: remember to add nodes

      this.graphManager.addEdge(funcName, condName, blockName, "then");

      const realFuncName = this.stateManager.initializeFunction(
        blockName,
        node
      );
      this.graphManager.initializeFunction(realFuncName);

      this.visitStatementChildren(ifBlock);

      this.stateManager.popFunction();
    }

    // there is a else block
    if (blocks.length === 2) {
      const elseBlock = blocks[1];

      const blockName = condName + "_else";
      // TODO: remember to add nodes

      this.graphManager.addEdge(funcName, condName, blockName, "else");

      const realFuncName = this.stateManager.initializeFunction(
        blockName,
        node
      );
      this.graphManager.initializeFunction(realFuncName);

      this.visitStatementChildren(elseBlock);

      this.stateManager.popFunction();
    }

    this.visitExpressionChildren(node);
  }

  // TODO: MatchExpression
  // TODO: WhileExpression
  // TODO: LoopExpression
  // TODO: ForExpression

  visitCallExpressionNode(node: CallExpressionNode) {
    const funcInden = this.getIdentifiersFromNode(node);
    // TODO: draw function node if not declared
    this.stateManager.pushToCurrentStack(this.sliceSource(node), node);
    this.visitExpressionChildren(node);
  }

  // TODO: visit assignment expression
  visitAssignmentExpressionNode(node: AssignmentExpressionNode) {
    // TODO:
  }

  visitBinaryExpression(node: BinaryExpressionNode) {
    const arithOp = node.getChild("ArithOp");
    const bitOp = node.getChild("BitOp");
    const compareOp = node.getChild("CompareOp");
    const logicOp = node.getChild("LogicOp");

    const op = arithOp || bitOp || compareOp || logicOp;
    let opName = this.sliceSourceReplaced(op!);

    const opCount = this.stateManager.incrementCounter(opName);

    if (opCount !== 0) {
      opName += `_${opCount}`;
    }

    // TODO: check if the order is correct
    if (!node.type.is("Statement")) {
      this.stateManager.pushToCurrentStack(opName, op!);
    }

    this.mapExpressionChildren(node, (child) => {
      this.stateManager.pushToCurrentStack(opName, op!);
      child.accept(this);
    });
  }

  visitIdentifierNode(node: IdentifierNode) {
    // TODO: see if this is variable or a function
    this.stateManager.pushToCurrentStack(this.sliceSource(node), node);
  }

  visitLiteralExpressionNode(node: LiteralExpressionNode) {
    this.stateManager.pushToCurrentStack(this.sliceSource(node), node);
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

  private getBoundIdentifiersFromNode(node: RustSyntaxNodeDecor) {
    const boundElems = node.getChildren("BoundIdentifier");
    return boundElems.map((boundElem) =>
      this.source.slice(boundElem?.from, boundElem?.to).toString()
    );
  }

  private getIdentifiersFromNode(node: RustSyntaxNodeDecor) {
    const idenElems = node.getChildren("Identifier");
    return idenElems.map((idenElem) =>
      this.source.slice(idenElem?.from, idenElem?.to).toString()
    );
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
    while (this.stateManager.getCurrentStackLength() > 1) {
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
