import { FunctionItemNode, RustSyntaxNodeDecor } from "./node";

export class InternalStateManager {
  // stack the function so nodes know about where it belongs
  funcStack: string[] = [];
  // mapping of a function scope to stacked variable
  stacks: Record<string, string[]> = {};
  // internal counter for variable or expression
  counters: Record<string, Record<string, number>> = {};

  initializeFunction(funcName: string) {
    // collision
    if (funcName in this.funcStack) {
      funcName = funcName + "_copy";
    }

    this.stacks[funcName] = [];
    this.counters[funcName] = {};

    this.funcStack.push(funcName);

    return funcName;
  }

  popFunction() {
    return this.funcStack.pop();
  }

  peekCurrentFunctionName() {
    return this.funcStack[this.funcStack.length - 1];
  }

  pushToStack(funcName: string, name: string) {
    this.stacks[funcName].push(name);
  }

  pushToCurrentStack(name: string) {
    this.pushToStack(this.peekCurrentFunctionName(), name);
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
