import ts from "typescript";
import { FileRecord } from "../state/fileIndex";
import { functionIndex } from "../state/functionIndex";
import { callGraphIndex } from "../state/callGraphIndex";

export function analyzeFunctionCalls(files: FileRecord[]) {
  callGraphIndex.clear();

  for (const file of files) {
    const sourceFile = ts.createSourceFile(
      file.path,
      file.text,
      ts.ScriptTarget.Latest,
      true
    );

    function visit(node: ts.Node) {
      if (ts.isCallExpression(node)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(
          node.getStart()
        );

        const caller = functionIndex.findByLine(file.path, line);

        if (caller) {
          let calleeName = "unknown";

          if (ts.isIdentifier(node.expression)) {
            calleeName = node.expression.text;
          } else if (ts.isPropertyAccessExpression(node.expression)) {
            calleeName = node.expression.name.text;
          }

          callGraphIndex.add({
            callerId: caller.id,
            callerName: caller.name,
            calleeName,
            filePath: file.path,
            line,
          });
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }
}
