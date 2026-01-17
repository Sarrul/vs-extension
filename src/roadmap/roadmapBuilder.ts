import { fileIndex } from "../state/fileIndex";
import { functionIndex } from "../state/functionIndex";
import { callGraphIndex } from "../state/callGraphIndex";
import { RoadmapFile } from "./roadmapModel";

export function buildRoadmap(): RoadmapFile[] {
  return fileIndex.getAll().map((file) => {
    const functions = functionIndex
      .getAll()
      .filter((fn) => fn.filePath === file.path)
      .map((fn) => ({
        name: fn.name,
        filePath: fn.filePath,
        calls: callGraphIndex
          .getCallersOf(fn.name, fn.filePath)
          .map((c) => c.calleeName),
      }));

    return {
      path: file.path,
      functions,
    };
  });
}
