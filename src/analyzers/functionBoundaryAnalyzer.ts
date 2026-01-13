import ts from "typescript";
import { FileRecord } from "../state/fileIndex";
import { functionIndex } from "../state/functionIndex";

export function analyzeFunctionBoundaries(files: FileRecord[]) {
  functionIndex.clear();

  for (const file of files) {
    const sourceFile = ts.createSourceFile(
      file.path,
      file.text,
      ts.ScriptTarget.Latest,
      true
    );

    function visit(node: ts.Node) {
      // Function declaration
      if (ts.isFunctionDeclaration(node) && node.name) {
        const start = sourceFile.getLineAndCharacterOfPosition(
          node.getStart()
        ).line;
        const end = sourceFile.getLineAndCharacterOfPosition(
          node.getEnd()
        ).line;

        functionIndex.add({
          id: `${file.path}:${node.name.text}:${start}`,
          name: node.name.text,
          filePath: file.path,
          startLine: start,
          endLine: end,
        });
      }

      // Arrow function / function expression
      if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
        const start = sourceFile.getLineAndCharacterOfPosition(
          node.getStart()
        ).line;
        const end = sourceFile.getLineAndCharacterOfPosition(
          node.getEnd()
        ).line;

        functionIndex.add({
          id: `${file.path}:anonymous:${start}`,
          name: "anonymous",
          filePath: file.path,
          startLine: start,
          endLine: end,
        });
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }
}
