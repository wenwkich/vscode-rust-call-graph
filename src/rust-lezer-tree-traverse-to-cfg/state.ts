import { FunctionItemNode, RustSyntaxNodeDecor } from "./node";

export type NodeWithName<T> = {
  node: T | undefined;
  name: string;
};

export class InternalStateManager<T> {
  // stack the function so nodes know about where it belongs
  funcStack: NodeWithName<T>[] = [];
  // mapping of a function scope to stacked variable
  stacks: Record<string, NodeWithName<T>[]> = {};
  // internal counter for variable or expression
  counters: Record<string, Record<string, number>> = {};

  initializeFunction(funcName: string, node: T) {
    // collision
    if (funcName in this.funcStack) {
      funcName = funcName + "_copy";
    }

    this.stacks[funcName] = [];
    this.counters[funcName] = {};

    this.funcStack.push({
      name: funcName,
      node,
    });

    return funcName;
  }

  popFunction() {
    return this.funcStack.pop();
  }

  peekCurrentFunctionName() {
    return this.funcStack[this.funcStack.length - 1].name;
  }

  pushToStack(funcName: string, name: string, node: T) {
    this.stacks[funcName].push({
      name,
      node,
    });
  }

  pushToCurrentStack(name: string, node: T | undefined) {
    this.stacks[this.peekCurrentFunctionName()].push({
      name,
      node,
    });
    // console.log(
    //   this.stacks[this.peekCurrentFunctionName()].map(({ name }) => name)
    // );
  }

  popFromStack(funcName: string) {
    return this.stacks[funcName].pop();
  }

  popFromCurrentStack() {
    return this.stacks[this.peekCurrentFunctionName()].pop();
  }

  popAllFromCurrentStack() {
    let result = [];

    while (this.getCurrentStackLength() !== 0) {
      result.push(this.stacks[this.peekCurrentFunctionName()].pop()!);
    }

    return result;
  }

  peekStack(funcName: string) {
    const stack = this.stacks[funcName];
    return stack[stack.length - 1];
  }

  peekCurrentStack() {
    return this.peekStack(this.peekCurrentFunctionName());
  }

  getCurrentStackLength() {
    return this.stacks[this.peekCurrentFunctionName()].length;
  }

  isCurrentStackEmpty() {
    return this.getCurrentStackLength() === 0;
  }

  incrementCounter(innerCallOrOpName: string) {
    const funcName = this.peekCurrentFunctionName();
    if (!(innerCallOrOpName in this.counters[funcName])) {
      this.counters[funcName][innerCallOrOpName] = 0;
    }
    const originalCounter = this.counters[funcName][innerCallOrOpName];
    this.counters[funcName][innerCallOrOpName] += 1;
    return originalCounter;
  }

  getCounter(innerCallOrOpName: string) {
    return (
      this.counters[this.peekCurrentFunctionName()][innerCallOrOpName] || 0
    );
  }
}
