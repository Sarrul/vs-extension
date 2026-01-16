import * as vscode from "vscode";
import { CodeTreeProvider } from "./providers/CodeTreeProvider";
import { CodeWebviewProvider } from "./providers/CodeWebviewProvider";
import { scanWorkspaceFiles } from "./analyzers/core/workspaceScanner";
import { fileIndex } from "./state/fileIndex";
import { functionIndex } from "./state/functionIndex";
import { triggerIndex } from "./state/triggerIndex";
import { buildExecutionMermaid } from "./analyzers/debug/executionMermaidBuilder";
import { loadWorkspaceFileContents } from "./analyzers/core/fileContentLoader";
import { analyzeFunctionBoundaries } from "./analyzers/core/functionBoundaryAnalyzer";
import { analyzeFunctionCalls } from "./analyzers/core/functionCallAnalyzer";
import { analyzeRuntimeTriggers } from "./analyzers/runtime/runtimeTriggerAnalyzer";
import { mapErrorsToFunctions } from "./analyzers/debug/errorFunctionMapper";
import { buildCallerChain } from "./analyzers/debug/executionChainBuilder";
import { buildRoadmapMermaid } from "./roadmap/roadmapMermaidBuilder";

export function activate(context: vscode.ExtensionContext) {
  const treeProvider = new CodeTreeProvider();
  vscode.window.registerTreeDataProvider("codeTree", treeProvider);

  // show selected code command
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

  // show roadmap view command
  const roadmapDisposable = vscode.commands.registerCommand(
    "experiment.showRoadmap",
    async () => {
      const files = await scanWorkspaceFiles();
      await loadWorkspaceFileContents(files);

      analyzeFunctionBoundaries(fileIndex.getAll());
      analyzeFunctionCalls(fileIndex.getAll());

      const mermaidDiagram = buildRoadmapMermaid();

      CodeWebviewProvider.show(context, {
        summary: "Project Roadmap",
        errorText: "N/A",
        relevantCode: "N/A",
        selectedCode: "N/A",
        mermaidDiagram,
      });
    }
  );

  // show selected code command
  context.subscriptions.push(disposable);

  // show roadmap view command
  context.subscriptions.push(roadmapDisposable);
}
