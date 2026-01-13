import ts from "typescript";

/**
 * Function context used during AST traversal
 */
interface FunctionContext {
  id: string;
  name: string;
  calls: Set<string>;
}

/**
 * Extract call graph from TypeScript source code
 */
export function extractCallGraph(code: string) {
  const sourceFile = ts.createSourceFile(
    "temp.ts",
    code,
    ts.ScriptTarget.Latest,
    true
  );

  // Global graph (id -> function context)
  const graph: Record<string, FunctionContext> = {};

  // Function context stack (supports nested functions)
  const functionStack: FunctionContext[] = [];

  // Counter for anonymous functions
  let anonymousCounter = 0;

  /* ---------------- helpers ---------------- */

  function enterFunction(name: string) {
    const id = `${name}_${functionStack.length}_${anonymousCounter++}`;

    const ctx: FunctionContext = {
      id,
      name,
      calls: new Set(),
    };

    graph[id] = ctx;
    functionStack.push(ctx);
  }

  function exitFunction() {
    functionStack.pop();
  }

  function currentFunction(): FunctionContext | undefined {
    return functionStack[functionStack.length - 1];
  }

  function resolveCallName(expr: ts.Expression): string | null {
    // foo()
    if (ts.isIdentifier(expr)) {
      return expr.text;
    }

    // obj.foo(), this.bar(), service.api.call()
    if (ts.isPropertyAccessExpression(expr)) {
      const left = expr.expression.getText();
      const right = expr.name.text;
      return `${left}.${right}`;
    }

    return null;
  }

  /* ---------------- AST traversal ---------------- */

  function visit(node: ts.Node) {
    // Function declaration: function foo() {}
    if (ts.isFunctionDeclaration(node) && node.name) {
      enterFunction(node.name.text);
      ts.forEachChild(node, visit);
      exitFunction();
      return;
    }

    // Arrow function or function expression
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      enterFunction("anonymous");
      ts.forEachChild(node, visit);
      exitFunction();
      return;
    }

    // Function call
    if (ts.isCallExpression(node)) {
      const current = currentFunction();
      if (current) {
        const callee = resolveCallName(node.expression);
        if (callee) {
          current.calls.add(callee);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  /* ---------------- output ---------------- */

  // Convert Set -> Array (UI / Mermaid-д хэрэгтэй)
  return Object.fromEntries(
    Object.values(graph).map((fn) => [
      fn.id,
      {
        name: fn.name,
        calls: Array.from(fn.calls),
      },
    ])
  );
}
