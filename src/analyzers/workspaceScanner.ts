import * as vscode from "vscode";

export interface ScannedFile {
  uri: vscode.Uri;
  path: string;
}

export async function scanWorkspaceFiles(): Promise<ScannedFile[]> {
  const files: ScannedFile[] = [];

  if (!vscode.workspace.workspaceFolders) {
    return files;
  }

  // бүх ts / tsx файлууд
  const uris = await vscode.workspace.findFiles(
    "**/*.{ts,tsx}",
    "**/node_modules/**"
  );

  for (const uri of uris) {
    files.push({
      uri,
      path: uri.fsPath,
    });
  }

  return files;
}
