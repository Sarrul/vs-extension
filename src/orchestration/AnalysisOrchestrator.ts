// src/orchestration/AnalysisOrchestrator.ts
import { scanWorkspaceFiles } from "../analyzers/core/workspaceScanner";
import { loadWorkspaceFileContents } from "../analyzers/core/fileContentLoader";
import { analyzeFunctionBoundaries } from "../analyzers/core/functionBoundaryAnalyzer";
import { analyzeFunctionCalls } from "../analyzers/core/functionCallAnalyzer";
import { analyzeRuntimeTriggers } from "../analyzers/runtime/runtimeTriggerAnalyzer";
import { mapErrorsToFunctions } from "../analyzers/debug/errorFunctionMapper";
import { buildExecutionMermaid } from "../analyzers/debug/executionMermaidBuilder";
import { buildCallerChain } from "../analyzers/debug/executionChainBuilder";
import { fileIndex } from "../state/fileIndex";
import { triggerIndex } from "../state/triggerIndex";
import * as vscode from "vscode";

export async function runFullAnalysis(document?: vscode.TextDocument) {
  const files = await scanWorkspaceFiles();
  await loadWorkspaceFileContents(files);

  analyzeFunctionBoundaries(fileIndex.getAll());
  analyzeFunctionCalls(fileIndex.getAll());
  analyzeRuntimeTriggers(fileIndex.getAll());

  if (!document) {
    return { files: fileIndex.getAll(), functions: [] };
  }

  const errors = mapErrorsToFunctions(document);

  const enrichedErrors = errors.map((err) => ({
    ...err,
    callerChain: buildCallerChain(err.functionName, document.uri.fsPath),
    trigger: triggerIndex.find(err.functionName, document.uri.fsPath),
  }));

  const mermaid = buildExecutionMermaid(
    document.uri.fsPath,
    enrichedErrors.map((e) => e.functionName),
  );

  return {
    files: fileIndex.getAll(),
    errors: enrichedErrors, 
    mermaid,
  };
}
