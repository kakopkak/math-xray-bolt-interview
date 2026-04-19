import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import type { AssignmentAnalytics, AssignmentAnalyticsStudent } from "@/lib/assignment-analytics";
import { getMisconceptionDisplay } from "@/lib/misconception-labels";
import { getMisconceptionByCode, type MisconceptionType } from "@/lib/taxonomy";

export const RELATION_GRAPH_WIDTH = 920;
export const RELATION_GRAPH_HEIGHT = 440;

type RelationKind = AssignmentAnalytics["classIntelligence"]["misconceptionRelations"][number]["kind"];
type NodeDimension = MisconceptionType["dimension"];

export type RelationGraphNode = {
  id: string;
  label: string;
  dimension: NodeDimension;
  count: number;
  radius: number;
  x: number;
  y: number;
};

export type RelationGraphLink = {
  id: string;
  source: string;
  target: string;
  kind: RelationKind;
  support: number;
  weight: number;
  strokeWidth: number;
};

type SimulationNode = RelationGraphNode & SimulationNodeDatum;
type SimulationLink = RelationGraphLink &
  SimulationLinkDatum<SimulationNode> & {
    source: string | SimulationNode;
    target: string | SimulationNode;
  };

function scaleRadius(count: number, maxCount: number) {
  if (count <= 0 || maxCount <= 0) {
    return 16;
  }

  return Number((18 + (count / maxCount) * 18).toFixed(1));
}

function scaleStrokeWidth(kind: RelationKind, weight: number) {
  const base = kind === "co_occurs" ? 2.2 : 1.6;
  const range = kind === "co_occurs" ? 5.2 : 3.2;
  return Number((base + weight * range).toFixed(2));
}

export function splitGraphLabel(label: string, maxLineLength = 18, maxLines = 2) {
  const words = label.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [label];
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length <= maxLineLength || currentLine.length === 0) {
      currentLine = nextLine;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const head = lines.slice(0, maxLines - 1);
  const tail = lines.slice(maxLines - 1).join(" ");
  const shortenedTail =
    tail.length > maxLineLength ? `${tail.slice(0, Math.max(0, maxLineLength - 1)).trimEnd()}…` : tail;
  return [...head, shortenedTail];
}

export function filterStudentsByRelation(
  students: AssignmentAnalyticsStudent[],
  misconceptionCode: string | null
) {
  if (!misconceptionCode) {
    return students;
  }

  return students.filter((student) => {
    if (student.primaryMisconception === misconceptionCode) {
      return true;
    }

    return student.misconceptions.includes(misconceptionCode);
  });
}

export function buildRelationGraphData(analytics: AssignmentAnalytics) {
  const relations = analytics.classIntelligence.misconceptionRelations;
  const distributionCounts = new Map(
    analytics.misconceptionDistribution.map((item) => [item.code, item.count] as const)
  );
  const nodeCodes = new Set<string>();

  for (const relation of relations) {
    nodeCodes.add(relation.sourceCode);
    nodeCodes.add(relation.targetCode);
  }

  const sortedCodes = [...nodeCodes].sort((left, right) => {
    const countDelta = (distributionCounts.get(right) ?? 0) - (distributionCounts.get(left) ?? 0);
    if (countDelta !== 0) {
      return countDelta;
    }

    return getMisconceptionDisplay(left, "et").label.localeCompare(
      getMisconceptionDisplay(right, "et").label,
      "et"
    );
  });

  const maxCount = Math.max(1, ...sortedCodes.map((code) => distributionCounts.get(code) ?? 0));
  const centerX = RELATION_GRAPH_WIDTH / 2;
  const centerY = RELATION_GRAPH_HEIGHT / 2;
  const orbitRadius = Math.min(RELATION_GRAPH_WIDTH, RELATION_GRAPH_HEIGHT) * 0.34;

  const nodes: RelationGraphNode[] = sortedCodes.map((code, index) => {
    const label = getMisconceptionDisplay(code, "et").label;
    const count = distributionCounts.get(code) ?? 0;
    const angle = (index / Math.max(sortedCodes.length, 1)) * Math.PI * 2 - Math.PI / 2;

    return {
      id: code,
      label,
      dimension: getMisconceptionByCode(code)?.dimension ?? "mixed",
      count,
      radius: scaleRadius(count, maxCount),
      x: centerX + Math.cos(angle) * orbitRadius,
      y: centerY + Math.sin(angle) * orbitRadius,
    };
  });

  const links: RelationGraphLink[] = relations.map((relation) => ({
    id: `${relation.kind}:${relation.sourceCode}:${relation.targetCode}`,
    source: relation.sourceCode,
    target: relation.targetCode,
    kind: relation.kind,
    support: relation.support,
    weight: relation.weight,
    strokeWidth: scaleStrokeWidth(relation.kind, relation.weight),
  }));

  return {
    nodes,
    links,
    width: RELATION_GRAPH_WIDTH,
    height: RELATION_GRAPH_HEIGHT,
  };
}

export function layoutRelationGraph(
  graph: ReturnType<typeof buildRelationGraphData>,
  tickCount = 220
): {
  width: number;
  height: number;
  nodes: RelationGraphNode[];
  links: RelationGraphLink[];
} {
  const nodes: SimulationNode[] = graph.nodes.map((node) => ({ ...node }));
  const links: SimulationLink[] = graph.links.map((link) => ({ ...link }));

  forceSimulation(nodes)
    .force(
      "link",
      forceLink<SimulationNode, SimulationLink>(links)
        .id((node) => node.id)
        .distance((link) => (link.kind === "co_occurs" ? 150 : 210))
        .strength((link) => (link.kind === "co_occurs" ? 0.4 + link.weight * 0.3 : 0.12))
    )
    .force("charge", forceManyBody<SimulationNode>().strength(-900))
    .force("collide", forceCollide<SimulationNode>().radius((node) => node.radius + 34).iterations(2))
    .force("center", forceCenter(graph.width / 2, graph.height / 2))
    .stop()
    .tick(tickCount);

  const margin = 44;
  for (const node of nodes) {
    node.x = Math.max(margin + node.radius, Math.min(graph.width - margin - node.radius, node.x ?? graph.width / 2));
    node.y = Math.max(margin + node.radius, Math.min(graph.height - margin - node.radius, node.y ?? graph.height / 2));
  }

  return {
    width: graph.width,
    height: graph.height,
    nodes: nodes.map((node) => ({
      id: node.id,
      label: node.label,
      dimension: node.dimension,
      count: node.count,
      radius: node.radius,
      x: node.x ?? graph.width / 2,
      y: node.y ?? graph.height / 2,
    })),
    links: graph.links,
  };
}
