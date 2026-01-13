export interface FunctionRecord {
  id: string;
  name: string;
  filePath: string;
  startLine: number;
  endLine: number;
}

class FunctionIndex {
  private functions: FunctionRecord[] = [];

  clear() {
    this.functions = [];
  }

  add(fn: FunctionRecord) {
    this.functions.push(fn);
  }

  getAll(): FunctionRecord[] {
    return this.functions;
  }

  findByLine(filePath: string, line: number): FunctionRecord | undefined {
    return this.functions.find(
      (fn) =>
        fn.filePath === filePath && line >= fn.startLine && line <= fn.endLine
    );
  }
}

export const functionIndex = new FunctionIndex();
