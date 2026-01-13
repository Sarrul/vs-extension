export function callGraphToMermaid(graph: Record<string, string[]>): string {
  let result = "graph TD\n";

  for (const fn in graph) {
    for (const callee of graph[fn]) {
      result += `  ${fn} --> ${callee}\n`;
    }
  }

  return result;
}
