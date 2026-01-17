// import { functionIndex } from "../state/functionIndex";
// import { callGraphIndex } from "../state/callGraphIndex";
// import { triggerIndex } from "../state/triggerIndex";

// export function buildProjectExecutionMermaid(): string {
//   let mermaid = "graph TD\n";
//   const added = new Set<string>();

//   const functions = functionIndex.getAll();
//   const edges = callGraphIndex.getAll();

//   for (const fn of functions) {
//     const nodeId = fn.id.replace(/[:\/\\]/g, "_");
//     const trigger = triggerIndex.find(fn.name, fn.filePath);

//     const label = trigger ? `${fn.name} ⚡ (${trigger.trigger})` : fn.name;

//     if (!added.has(nodeId)) {
//       mermaid += `  ${nodeId}["${label}"]\n`;
//       added.add(nodeId);
//     }
//   }

//   for (const edge of edges) {
//     if (!edge.calleeId) continue;

//     const from = edge.callerId.replace(/[:\/\\]/g, "_");
//     const to = edge.calleeId.replace(/[:\/\\]/g, "_");

//     mermaid += `  ${from} --> ${to}\n`;
//   }

//   return mermaid;
// }

import { functionIndex } from "../state/functionIndex";
import { callGraphIndex } from "../state/callGraphIndex";

export function buildRoadmapMermaid(): string {
  let mermaid = "graph TD\n";
  const added = new Set<string>();

  const functions = functionIndex.getAll();
  const edges = callGraphIndex.getAll();

  for (const fn of functions) {
    const id = fn.id.replace(/[:\/\\]/g, "_");

    if (!added.has(id)) {
      mermaid += `  ${id}["${fn.name}"]\n`;
      added.add(id);
    }
  }

  for (const edge of edges) {
    if (!edge.calleeId) continue;

    const from = edge.callerId.replace(/[:\/\\]/g, "_");
    const to = edge.calleeId.replace(/[:\/\\]/g, "_");

    mermaid += `  ${from} --> ${to}\n`;
  }

  return mermaid;
}
