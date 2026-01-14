import * as ts from "typescript";
import { functionIndex } from "../state/functionIndex";

export function analyzeFunctionBoundaries(
  files: { path: string; text: string }[]
) {
  functionIndex.clear();

  for (const file of files) {
    const sourceFile = ts.createSourceFile(
      file.path,
      file.text,
      ts.ScriptTarget.Latest,
      true
    );

    const functionStack: string[] = [];

    function registerFunction(name: string, node: ts.Node) {
      const parentFunction =
        functionStack.length > 0
          ? functionStack[functionStack.length - 1]
          : undefined;

      const startLine =
        sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

      const endLine =
        sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;

      functionIndex.add({
        id: `${file.path}:${name}:${startLine}`,
        name,
        filePath: file.path,
        startLine,
        endLine,
        parentFunction,
      });

      functionStack.push(name);
      ts.forEachChild(node, visit);
      functionStack.pop();
    }

    function visit(node: ts.Node) {
      // function Home() {}
      if (ts.isFunctionDeclaration(node) && node.name) {
        registerFunction(node.name.text, node);
        return;
      }

      // const handleSubmitt = async () => {}
      if (
        ts.isVariableDeclaration(node) &&
        node.initializer &&
        (ts.isArrowFunction(node.initializer) ||
          ts.isFunctionExpression(node.initializer)) &&
        ts.isIdentifier(node.name)
      ) {
        registerFunction(node.name.text, node.initializer);
        return;
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }
}
