import * as vscode from "vscode";
import { CodeTreeProvider } from "./providers/CodeTreeProvider";
import { CodeWebviewProvider } from "./providers/CodeWebviewProvider";
import { extractCallGraph } from "./analyzers/callGraphAnalyzer";
import { callGraphToMermaid } from "./analyzers/mermaidGenerator";
import { scanWorkspaceFiles } from "./analyzers/workspaceScanner";
import { loadWorkspaceFileContents } from "./analyzers/fileContentLoader";
import { fileIndex } from "./state/fileIndex";

export function activate(context: vscode.ExtensionContext) {
  const treeProvider = new CodeTreeProvider();
  vscode.window.registerTreeDataProvider("codeTree", treeProvider);

  const disposable = vscode.commands.registerCommand(
    "experiment.showSelectedCode",
    async () => {
      /* ---------- PHASE 1: scan workspace ---------- */
      const files = await scanWorkspaceFiles();

      /* ---------- PHASE 2.1: load file contents ---------- */
      await loadWorkspaceFileContents(files);

      vscode.window.showInformationMessage(
        `Indexed ${fileIndex.getAll().length} files with content`
      );

      /* ---------- existing UI logic (UNCHANGED) ---------- */

      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor");
        return;
      }

      const document = editor.document;

      const selectedCode =
        editor.selection && !editor.selection.isEmpty
          ? document.getText(editor.selection)
          : "No code selected";

      const callGraph = extractCallGraph(document.getText());
      const mermaidDiagram = callGraphToMermaid(callGraph);

      CodeWebviewProvider.show(context, {
        summary: "Workspace indexed",
        errorText: "N/A",
        relevantCode: "N/A",
        selectedCode,
        mermaidDiagram,
      });
    }
  );

  context.subscriptions.push(disposable);
}
