import * as vscode from "vscode";
import { CodeTreeProvider } from "./providers/CodeTreeProvider";
import { CodeWebviewProvider } from "./providers/CodeWebviewProvider";
import { extractCallGraph } from "./analyzers/callGraphAnalyzer";
import { callGraphToMermaid } from "./analyzers/mermaidGenerator";
import { scanWorkspaceFiles } from "./analyzers/workspaceScanner";
import { loadWorkspaceFileContents } from "./analyzers/fileContentLoader";
import { fileIndex } from "./state/fileIndex";
import { analyzeFunctionBoundaries } from "./analyzers/functionBoundaryAnalyzer";
import { functionIndex } from "./state/functionIndex";
import { mapErrorsToFunctions } from "./analyzers/errorFunctionMapper";
import { analyzeFunctionCalls } from "./analyzers/functionCallAnalyzer";
import { buildCallerChain } from "./analyzers/executionChainBuilder";
import { analyzeRuntimeTriggers } from "./analyzers/runtimeTriggerAnalyzer";
import { triggerIndex } from "./state/triggerIndex";
import { buildExecutionMermaid } from "./analyzers/executionMermaidBuilder";

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

      /* ---------- PHASE 2.2: analyze function boundaries ---------- */
      analyzeFunctionBoundaries(fileIndex.getAll());

      vscode.window.showInformationMessage(
        `Indexed ${fileIndex.getAll().length} files with content`
      );

      vscode.window.showInformationMessage(
        `Indexed ${functionIndex.getAll().length} functions`
      );

      /* ---------- PHASE 3: analyze function calls ---------- */
      analyzeFunctionCalls(fileIndex.getAll());

      /* ---------- PHASE 4A: analyze runtime triggers ---------- */
      analyzeRuntimeTriggers(fileIndex.getAll());

      /* ---------- ACTIVE EDITOR ---------- */
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor");
        return;
      }

      const document = editor.document;

      /* ---------- PHASE 2.3 + 3 + 4A: error mapping + chain + trigger ---------- */
      const mappedErrors = mapErrorsToFunctions(document);

      mappedErrors.forEach((err) => {
        const chain = buildCallerChain(err.functionName, document.uri.fsPath);

        const trigger = triggerIndex.find(
          err.functionName,
          document.uri.fsPath
        );

        console.log("[DEBUG] function:", err.functionName, "trigger:", trigger);

        vscode.window.showErrorMessage(
          `❌ ${chain.join(" → ")}: ${err.message}`
        );

        if (trigger) {
          vscode.window.showInformationMessage(
            `🔔 Triggered by: ${trigger.trigger}`
          );
        }
      });

      /* ---------- existing UI logic ---------- */
      const selectedCode =
        editor.selection && !editor.selection.isEmpty
          ? document.getText(editor.selection)
          : "No code selected";

      const errorFunctions = mappedErrors.map((e) => e.functionName);

      const mermaidDiagram = buildExecutionMermaid(
        document.uri.fsPath,
        errorFunctions
      );

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
