export interface RoadmapFunction {
  name: string;
  filePath: string;
  calls: string[];
}

export interface RoadmapFile {
  path: string;
  functions: RoadmapFunction[];
}
