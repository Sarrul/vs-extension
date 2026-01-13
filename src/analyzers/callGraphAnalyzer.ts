import ts from "typescript";

export function extractCallGraph(code: string) {
  const sourceFile = ts.createSourceFile(
    "temp.ts",
    code,
    ts.ScriptTarget.Latest,
    true
  );

  const callGraph: Record<string, Set<string>> = {};
  let currentFunction: string | null = null;

  function visit(node: ts.Node) {
    // Function declarations
    if (ts.isFunctionDeclaration(node) && node.name) {
      currentFunction = node.name.text;
      callGraph[currentFunction] = new Set();
    }

    // Arrow functions / function expressions
    if (
      (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
      currentFunction === null
    ) {
      currentFunction = "anonymous";
      callGraph[currentFunction] = new Set();
    }

    // Function calls
    if (ts.isCallExpression(node) && currentFunction) {
      const expression = node.expression;
      if (ts.isIdentifier(expression)) {
        callGraph[currentFunction].add(expression.text);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  console.log("CALL GRAPH:", callGraph);

  // Convert Set → Array
  return Object.fromEntries(
    Object.entries(callGraph).map(([k, v]) => [k, Array.from(v)])
  );
}
