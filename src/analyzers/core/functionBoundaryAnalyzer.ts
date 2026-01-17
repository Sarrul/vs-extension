import * as ts from "typescript";
import { functionIndex } from "../../state/functionIndex";

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
      // 1. function Home() {}
      if (ts.isFunctionDeclaration(node) && node.name) {
        registerFunction(node.name.text, node);
        return;
      }

      // 2. const handleSubmit = async () => {}
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

      // 3. Method declarations: class methods
      if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
        registerFunction(node.name.text, node);
        return;
      }

      // 4. Object literal methods: { handleClick() {} }
      if (
        ts.isMethodDeclaration(node) ||
        ts.isShorthandPropertyAssignment(node)
      ) {
        if (ts.isIdentifier(node.name)) {
          registerFunction(node.name.text, node);
          return;
        }
      }

      // 5. Property assignments with functions: obj.method = function() {}
      if (
        ts.isPropertyAssignment(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        (ts.isArrowFunction(node.initializer) ||
          ts.isFunctionExpression(node.initializer))
      ) {
        registerFunction(node.name.text, node.initializer);
        return;
      }

      // 6. Export const/function patterns
      if (ts.isExportAssignment(node) && node.expression) {
        if (
          ts.isFunctionExpression(node.expression) ||
          ts.isArrowFunction(node.expression)
        ) {
          registerFunction("default", node.expression);
          return;
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }
}
