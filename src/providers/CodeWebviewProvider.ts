import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { fileIndex } from "../state/fileIndex";
import { functionIndex, FunctionRecord } from "../state/functionIndex";
import { callGraphIndex } from "../state/callGraphIndex";
import {
  RoadmapData,
  RoadmapFile,
  RoadmapFunction,
} from "../roadmap/roadmapModel";

export class CodeWebviewProvider {
  static show(
    context: vscode.ExtensionContext,
    data: {
      summary: string;
      errorText: string;
      relevantCode: string;
      selectedCode: string;
      mermaidDiagram: string;
    },
  ) {
    const panel = vscode.window.createWebviewPanel(
      "codeExplanation",
      "Filtered Prompt Preview",
      vscode.ViewColumn.Beside,
      { enableScripts: true },
    );

    panel.webview.html = this.getHtml(panel.webview, context, data);
  }

  static showRoadmap(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel(
      "roadmapView",
      "📊 Project Roadmap",
      vscode.ViewColumn.Beside,
      { enableScripts: true },
    );

    panel.webview.html = this.getRoadmapHtml(panel.webview, context);
  }

  private static getRoadmapHtml(
    webview: vscode.Webview,
    context: vscode.ExtensionContext,
  ): string {
    const htmlPath = path.join(
      context.extensionPath,
      "src",
      "webview",
      "roadmap.html",
    );

    let html = fs.readFileSync(htmlPath, "utf8");

    // Build roadmap data structure
    const roadmapData = this.buildRoadmapData();

    // Inject data as a proper JSON script tag
    const dataScript = `<script>window.ROADMAP_DATA = ${JSON.stringify(roadmapData)};</script>`;

    // Insert script before closing </head> tag
    html = html.replace("</head>", `${dataScript}\n</head>`);

    return html;
  }

  private static buildRoadmapData(): RoadmapData {
    const files = fileIndex.getAll();
    const roadmapFiles: RoadmapFile[] = [];

    console.log(`[buildRoadmapData] Processing ${files.length} files`);

    for (const file of files) {
      const fileName = file.path.split("/").pop() || file.path;
      const functions: RoadmapFunction[] = functionIndex
        .getAll()
        .filter((fn) => fn.filePath === file.path)
        .map((fn) => {
          const calls = callGraphIndex
            .getAll()
            .filter((edge) => edge.callerId === fn.id)
            .map((edge) => edge.calleeName);

          return {
            name: fn.name,
            filePath: fn.filePath,
            emoji: this.getFunctionEmoji(fn.name),
            calls: calls,
            startLine: fn.startLine,
            endLine: fn.endLine,
          };
        });

      if (functions.length > 0) {
        roadmapFiles.push({
          name: fileName,
          path: file.path,
          functions: functions,
        });
      }
    }

    const result: RoadmapData = {
      files: roadmapFiles,
      totalFiles: roadmapFiles.length,
      totalFunctions: functionIndex.getAll().length,
      totalConnections: callGraphIndex.getAll().length,
    };

    console.log(
      `[buildRoadmapData] Result: ${result.totalFiles} files, ${result.totalFunctions} functions`,
    );

    return result;
  }

  private static buildMermaidDiagram(): string {
    let mermaid = "graph TD\n";
    const added = new Set<string>();
    const files = fileIndex.getAll();

    // Group functions by file - properly typed
    const fileGroups = new Map<string, FunctionRecord[]>();

    for (const fn of functionIndex.getAll()) {
      if (!fileGroups.has(fn.filePath)) {
        fileGroups.set(fn.filePath, []);
      }
      const group = fileGroups.get(fn.filePath);
      if (group) {
        group.push(fn);
      }
    }

    // Create file nodes and function nodes
    for (const file of files) {
      const fileName = file.path.split("/").pop() || file.path;
      const fileId = `file_${this.sanitizeId(file.path)}`;

      const funcs = fileGroups.get(file.path) || [];
      if (funcs.length === 0) continue;

      if (!added.has(fileId)) {
        mermaid += `  ${fileId}["📁 ${fileName}"]\n`;
        mermaid += `  style ${fileId} fill:#2d3748,stroke:#4a5568,stroke-width:2px\n`;
        added.add(fileId);
      }

      for (const fn of funcs) {
        const fnId = this.sanitizeId(fn.id);

        if (!added.has(fnId)) {
          const emoji = this.getFunctionEmoji(fn.name);
          mermaid += `  ${fnId}["${emoji} ${fn.name}"]\n`;

          const color = this.getFunctionColor(fn.name);
          mermaid += `  style ${fnId} fill:${color}\n`;

          added.add(fnId);
        }

        // Connect file to function
        mermaid += `  ${fileId} -.-> ${fnId}\n`;
      }
    }

    // Add call relationships
    const edges = callGraphIndex.getAll();
    const processedEdges = new Set<string>();

    for (const edge of edges) {
      if (!edge.calleeId) continue;

      const fromId = this.sanitizeId(edge.callerId);
      const toId = this.sanitizeId(edge.calleeId);
      const edgeKey = `${fromId}_${toId}`;

      if (processedEdges.has(edgeKey)) continue;
      processedEdges.add(edgeKey);

      if (added.has(fromId) && added.has(toId)) {
        mermaid += `  ${fromId} --> ${toId}\n`;
      }
    }

    return mermaid;
  }

  private static sanitizeId(id: string): string {
    return id
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^_|_$/g, "")
      .substring(0, 50);
  }

  private static getFunctionEmoji(name: string): string {
    const lower = name.toLowerCase();

    if (
      lower.startsWith("handle") ||
      lower.includes("click") ||
      lower.includes("submit")
    ) {
      return "🎯";
    }
    if (lower.startsWith("use") || lower.includes("hook")) {
      return "🪝";
    }
    if (
      lower.includes("fetch") ||
      lower.includes("get") ||
      lower.includes("load")
    ) {
      return "📥";
    }
    if (
      lower.includes("save") ||
      lower.includes("update") ||
      lower.includes("post")
    ) {
      return "💾";
    }
    if (lower.includes("render") || lower.includes("component")) {
      return "🎨";
    }
    if (
      lower.includes("analyze") ||
      lower.includes("build") ||
      lower.includes("process")
    ) {
      return "⚙️";
    }

    return "⚡";
  }

  private static getFunctionColor(name: string): string {
    const lower = name.toLowerCase();

    if (
      lower.startsWith("handle") ||
      lower.includes("click") ||
      lower.includes("submit")
    ) {
      return "#3182ce";
    }
    if (lower.startsWith("use")) {
      return "#805ad5";
    }
    if (
      lower.includes("fetch") ||
      lower.includes("get") ||
      lower.includes("save")
    ) {
      return "#38a169";
    }
    if (lower.includes("analyze") || lower.includes("build")) {
      return "#dd6b20";
    }

    return "#4a5568";
  }

  private static getHtml(
    webview: vscode.Webview,
    context: vscode.ExtensionContext,
    data: {
      summary: string;
      errorText: string;
      relevantCode: string;
      selectedCode: string;
      mermaidDiagram: string;
    },
  ): string {
    const htmlPath = path.join(
      context.extensionPath,
      "src",
      "webview",
      "index.html",
    );

    let html = fs.readFileSync(htmlPath, "utf8");

    html = html
      .replace("{{SUMMARY}}", this.escape(data.summary))
      .replace("{{ERROR}}", this.escape(data.errorText))
      .replace("{{RELEVANT}}", this.escape(data.relevantCode))
      .replace("{{SELECTED}}", this.escape(data.selectedCode))
      .replace("{{MERMAID}}", this.escape(data.mermaidDiagram));

    return html;
  }

  private static escape(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}
