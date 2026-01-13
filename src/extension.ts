import * as vscode from "vscode";
import { CodeTreeProvider } from "./providers/CodeTreeProvider";
import { CodeWebviewProvider } from "./providers/CodeWebviewProvider";
import { extractCallGraph } from "./analyzers/callGraphAnalyzer";
import { callGraphToMermaid } from "./analyzers/mermaidGenerator";

export function activate(context: vscode.ExtensionContext) {
  const treeProvider = new CodeTreeProvider();

  vscode.window.registerTreeDataProvider("codeTree", treeProvider);

  //   diagnostic helper functions
  function getDiagnostics(document: vscode.TextDocument) {
    return vscode.languages.getDiagnostics(document.uri);
  }

  // get error context
  function getErrorContext(
    document: vscode.TextDocument,
    range: vscode.Range,
    padding = 8
  ) {
    const startLine = Math.max(0, range.start.line - padding);
    const endLine = Math.min(document.lineCount - 1, range.end.line + padding);

    return document.getText(new vscode.Range(startLine, 0, endLine, 0));
  }

  // summary
  function summarizeFile(document: vscode.TextDocument): string {
    const text = document.getText();

    const imports = (text.match(/^import .*$/gm) || []).length;
    const functions = (text.match(/function\s+\w+|\=\>/g) || []).length;

    return `
- Language: ${document.languageId}
- Imports: ${imports}
- Functions/Blocks: ${functions}
- File: ${document.uri.fsPath.split("/").pop()}
  `.trim();
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("experiment.openExplanation", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor");
        return;
      }

      const document = editor.document;

      const selectedCode =
        document.getText(editor.selection) || "No code selected";

      const diagnostics = getDiagnostics(document);

      let errorText = "No errors detected.";
      let relevantCode = "N/A";

      if (diagnostics.length > 0) {
        const diag = diagnostics[0];
        errorText = diag.message;
        relevantCode = getErrorContext(document, diag.range);
      }

      const summary = summarizeFile(document);
      const callGraph = extractCallGraph(document.getText());
      const mermaidDiagram = callGraphToMermaid(callGraph);

      CodeWebviewProvider.show(context, {
        summary,
        errorText,
        relevantCode,
        selectedCode,
        mermaidDiagram,
      });
    })
  );
}
