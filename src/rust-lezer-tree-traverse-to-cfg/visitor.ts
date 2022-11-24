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

  constructor(source: string | Buffer) {
    this.source = source;
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
    const funcName = this.getName(node);

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
    let varNames = this.getBoundIdentifiers(node);

    this.visitExpressionChildren(node);

    this.popAllAndDrawGraph();
    const lastItem = this.stateManager.popFromCurrentStack();
    const funcName = this.stateManager.peekCurrentFunctionName();

    varNames.map((varName) => {
      const counter = this.stateManager.incrementCounter(varName);

      if (counter !== 0) {
        varName += `_${counter}`;
      }

      this.graphManager.addVarNode(funcName, varName, varName);

      // connect the last item with variables
      if (lastItem) {
        this.graphManager.addEdge(funcName, lastItem.name, varName);
      }
    });

    if (lastItem) {
      if (
        node.parent?.name === "IfExpression" ||
        node.parent?.name === "MatchExpression" ||
        node.parent?.name === "WhileExpression" ||
        node.parent?.name === "ForExpression"
      ) {
        this.stateManager.pushToCurrentStack(lastItem.name, lastItem.node);
      }
    }
  }

  /** EXPRESSIONS */
  visitIfExpressionNode(node: IfExpressionNode) {
    // traverse the condition first
    const letStatement = node.getChild("LetDeclaration");
    const expression = node.getChild("Expression");

    const funcName = this.stateManager.peekCurrentFunctionName();

    const cond = letStatement || expression;
    const condName = cond !== null ? this.sliceSourceReplaced(cond) : "";
    cond &&
      this.graphManager.addVarNode(
        funcName,
        condName,
        "if " + this.sliceSource(cond)
      );

    cond?.accept(this);
    const lastElems = this.stateManager.popAllFromCurrentStack();

    lastElems.map((elem) => {
      this.graphManager.addEdge(funcName, elem!.name, condName);
    });

    const blocks = node.getChildren("Block");
    const handleBlock = (block: RustSyntaxNodeDecor, name: string) => {
      const blockName = condName + `_${name}`;
      this.graphManager.addFuncNode(funcName, blockName, `${name} block`);

      this.graphManager.addEdge(funcName, condName, blockName, name);

      const realFuncName = this.stateManager.initializeFunction(
        blockName,
        node
      );
      this.graphManager.initializeFunction(realFuncName);

      this.visitStatementChildren(block);

      this.stateManager.popFunction();
    };

    // if block
    if (blocks.length >= 1) {
      handleBlock(blocks[0], "then");
    }

    // there is a else block
    if (blocks.length === 2) {
      handleBlock(blocks[1], "else");
    }

    this.visitExpressionChildren(node);
  }

  // TODO: MatchExpression
  // TODO: WhileExpression
  // TODO: LoopExpression
  // TODO: ForExpression

  visitCallExpressionNode(node: CallExpressionNode) {
    const funcIden = node.getChild("Identifier");
    const argList = node.getChild("ArgList");

    console.log(this.sliceSource(node));
    console.log(this.sliceSource(funcIden!));
    console.log(node.parent?.name);

    if (!node.type.is("Statement")) {
      console.log("is statement");
      this.stateManager.pushToCurrentStack(
        this.sliceSource(funcIden!),
        funcIden!
      );
    }
    this.mapExpressionChildren(argList!, (child) => {
      this.stateManager.pushToCurrentStack(
        this.sliceSource(funcIden!),
        funcIden!
      );
      child.accept(this);
    });
  }

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

    const funcName = this.stateManager.peekCurrentFunctionName();
    this.graphManager.addNonClickyFuncNode(
      funcName,
      opName,
      this.sliceSource(op!)
    );

    if (!node.type.is("Statement")) {
      this.stateManager.pushToCurrentStack(opName, op!);
    }

    this.mapExpressionChildren(node, (child) => {
      this.stateManager.pushToCurrentStack(opName, op!);
      child.accept(this);
    });
  }

  visitIdentifierNode(node: IdentifierNode) {
    // see if this is variable or a function
    const name = this.sliceSource(node);
    const contextFuncName = this.stateManager.peekCurrentFunctionName();
    if (node.parent?.name === "CallExpression") {
      // need to check number
      const counter = this.stateManager.incrementCounter(name);
      const realName = counter === 0 ? name : `${name}_${counter}`;
      this.graphManager.addFuncNode(contextFuncName, realName, realName);
    } else {
      if (this.stateManager.getCounter(name) === 0) {
        this.graphManager.addVarNode(contextFuncName, name, name);
      }
    }
    this.stateManager.pushToCurrentStack(this.sliceSource(node), node);
  }

  visitLiteralExpressionNode(node: LiteralExpressionNode) {
    const contextFuncName = this.stateManager.peekCurrentFunctionName();
    const name = this.sliceSource(node);
    this.graphManager.addVarNode(contextFuncName, name, name);
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

  private getName(node: FunctionItemNode | LetDeclarationNode) {
    const boundElem = node.getChild("BoundIdentifier");
    return this.source.slice(boundElem?.from, boundElem?.to).toString();
  }

  private getBoundIdentifiers(node: RustSyntaxNodeDecor) {
    const boundElems = node.getChildren("BoundIdentifier");
    return boundElems.map((boundElem) =>
      this.source.slice(boundElem?.from, boundElem?.to).toString()
    );
  }

  private recursiveGetBoundIden(node: RustSyntaxNodeDecor): string[] {
    const boundIdens = node.getChildren("BoundIdentifier");
    const thisLevelRes = boundIdens.map((boundElem) =>
      this.source.slice(boundElem?.from, boundElem?.to).toString()
    );
    const exprs = node.getChildren("Expression");
    return thisLevelRes.concat(
      exprs.map((expr) => this.recursiveGetBoundIden(expr)).flat(1)
    );
  }

  private getIdentifiers(node: RustSyntaxNodeDecor) {
    const idenElems = node.getChildren("Identifier");
    return idenElems.map((idenElem) =>
      this.source.slice(idenElem?.from, idenElem?.to).toString()
    );
  }

  private sliceSourceReplaced(node: RustSyntaxNodeDecor) {
    return this.sliceSource(node)
      .replace(
        /<<|>>|&&|\|\||>=|<=|==|[\W]|\s/g,
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
            "=": "_eq_to_",
            // eslint-disable-next-line @typescript-eslint/naming-convention
            "<": "_lt_",
            // eslint-disable-next-line @typescript-eslint/naming-convention
            ">": "_gt_",
          }[m] || "_")
      )
      .replace(/_+/g, "_");
  }

  private sliceSource(node: RustSyntaxNodeDecor) {
    return this.source.slice(node.from, node.to).toString();
  }

  /** draw graph from stack */
  private popAllAndDrawGraph() {
    this.popAllUntilNAndDrawGraph(1);
  }

  private popAllUntilNAndDrawGraph(n: number) {
    while (this.stateManager.getCurrentStackLength() > n) {
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
