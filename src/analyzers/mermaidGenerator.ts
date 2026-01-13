export function callGraphToMermaid(
  graph: Record<string, { name: string; calls: string[] }>
): string {
  let result = "graph TD\n";

  for (const id in graph) {
    const fn = graph[id];

    // Node definition (unique id + label)
    result += `  ${id}["${fn.name}"]\n`;

    for (const callee of fn.calls) {
      const calleeId = callee.replace(/\W/g, "_");
      result += `  ${id} --> ${calleeId}["${callee}"]\n`;
    }
  }

  return result;
}
