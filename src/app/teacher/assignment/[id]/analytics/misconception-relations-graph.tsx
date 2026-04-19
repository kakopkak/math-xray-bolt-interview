"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { AssignmentAnalytics } from "@/lib/assignment-analytics";
import { getMisconceptionDisplay } from "@/lib/misconception-labels";
import {
  buildRelationGraphData,
  layoutRelationGraph,
  splitGraphLabel,
  type RelationGraphNode,
} from "./relation-graph";

type Props = {
  analytics: AssignmentAnalytics;
  activeCode: string | null;
  onSelectCode: (code: string | null) => void;
};

const dimensionStyles = {
  procedural: {
    fill: "color-mix(in oklab, var(--color-brand) 26%, var(--color-surface-raised))",
    stroke: "var(--color-brand)",
    label: "Protseduuriline",
  },
  conceptual: {
    fill: "color-mix(in oklab, var(--color-success) 22%, var(--color-surface-raised))",
    stroke: "var(--color-success)",
    label: "Kontseptuaalne",
  },
  mixed: {
    fill: "color-mix(in oklab, var(--color-warning) 20%, var(--color-surface-raised))",
    stroke: "var(--color-warning)",
    label: "Segatüüp",
  },
} as const;

function describeNode(node: RelationGraphNode) {
  const studentLabel = node.count === 1 ? "õpilane" : "õpilast";
  return `${node.label} · ${node.count} ${studentLabel}`;
}

function describeRelation(kind: Props["analytics"]["classIntelligence"]["misconceptionRelations"][number]["kind"]) {
  if (kind === "co_occurs") {
    return "Seotud väärarusaamad";
  }

  return "Tuletatud teema struktuurist";
}

function describeRelationSupport(
  kind: Props["analytics"]["classIntelligence"]["misconceptionRelations"][number]["kind"],
  support: number
) {
  const studentLabel = support === 1 ? "õpilane" : "õpilast";
  return `${describeRelation(kind)} · ${support} ${studentLabel}`;
}

export function MisconceptionRelationsGraph({ analytics, activeCode, onSelectCode }: Props) {
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const graph = useMemo(
    () => layoutRelationGraph(buildRelationGraphData(analytics)),
    [analytics]
  );

  const nodeById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node] as const)),
    [graph.nodes]
  );
  const focusedCode = hoveredCode ?? activeCode;
  const focusedNode = focusedCode ? nodeById.get(focusedCode) ?? null : null;
  const connectedLinks = focusedCode
    ? graph.links.filter((link) => link.source === focusedCode || link.target === focusedCode)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Seotud väärarusaamad</Badge>
          <Badge variant="neutral">Tuletatud teema struktuurist</Badge>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
          {Object.values(dimensionStyles).map((dimension) => (
            <span key={dimension.label} className="inline-flex items-center gap-2">
              <span
                className="size-2.5 rounded-full border"
                style={{
                  backgroundColor: dimension.fill,
                  borderColor: dimension.stroke,
                }}
              />
              {dimension.label}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[linear-gradient(160deg,color-mix(in_oklab,var(--color-surface-raised)_92%,var(--color-brand)_8%)_0%,var(--color-surface)_100%)] p-4">
        <svg
          data-testid="misconception-force-graph"
          viewBox={`0 0 ${graph.width} ${graph.height}`}
          role="img"
          aria-label="Väärarusaamade seoste kaart"
          className="w-full"
        >
          <rect
            x="0"
            y="0"
            width={graph.width}
            height={graph.height}
            rx="24"
            fill="transparent"
          />

          <g opacity={0.28} stroke="var(--color-border)">
            <line x1="0" x2={graph.width} y1={graph.height / 2} y2={graph.height / 2} strokeDasharray="6 8" />
            <line x1={graph.width / 2} x2={graph.width / 2} y1="0" y2={graph.height} strokeDasharray="6 8" />
          </g>

          {graph.links.map((link) => {
            const source = nodeById.get(link.source);
            const target = nodeById.get(link.target);
            if (!source || !target) {
              return null;
            }

            const isDimmed = focusedCode ? link.source !== focusedCode && link.target !== focusedCode : false;

            return (
              <line
                key={link.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={link.kind === "co_occurs" ? "var(--color-success)" : "var(--color-text-muted)"}
                strokeWidth={link.strokeWidth}
                strokeDasharray={link.kind === "depends_on" ? "10 7" : undefined}
                strokeLinecap="round"
                opacity={isDimmed ? 0.18 : link.kind === "co_occurs" ? 0.88 : 0.6}
              >
                <title>{describeRelationSupport(link.kind, link.support)}</title>
              </line>
            );
          })}

          {graph.nodes.map((node) => {
            const dimension = dimensionStyles[node.dimension as keyof typeof dimensionStyles];
            const lines = splitGraphLabel(node.label);
            const isActive = activeCode === node.id;
            const isDimmed = focusedCode ? focusedCode !== node.id && !connectedLinks.some((link) => link.source === node.id || link.target === node.id) : false;

            return (
              <g
                key={node.id}
                data-testid={`graph-node-${node.id}`}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer"
                onClick={() => onSelectCode(isActive ? null : node.id)}
                onMouseEnter={() => setHoveredCode(node.id)}
                onMouseLeave={() => setHoveredCode((current) => (current === node.id ? null : current))}
                onFocus={() => setHoveredCode(node.id)}
                onBlur={() => setHoveredCode((current) => (current === node.id ? null : current))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectCode(isActive ? null : node.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                aria-label={`${describeNode(node)}. Vajuta tabeli filtreerimiseks.`}
                opacity={isDimmed ? 0.28 : 1}
              >
                <circle
                  r={node.radius + (isActive ? 8 : 0)}
                  fill="transparent"
                  stroke={isActive ? dimension.stroke : "transparent"}
                  strokeWidth={isActive ? 2.5 : 0}
                />
                <circle
                  r={node.radius}
                  fill={dimension.fill}
                  stroke={dimension.stroke}
                  strokeWidth={2}
                />
                <circle
                  r={Math.max(8, node.radius * 0.34)}
                  fill={dimension.stroke}
                  opacity={0.12}
                />
                <text
                  textAnchor="middle"
                  y={node.radius + 20}
                  fill="var(--color-text)"
                  fontSize="13"
                  fontWeight="600"
                >
                  {lines.map((line, index) => (
                    <tspan key={`${node.id}-${index}`} x="0" dy={index === 0 ? 0 : 15}>
                      {line}
                    </tspan>
                  ))}
                </text>
                <text
                  textAnchor="middle"
                  y="4"
                  fill="var(--color-text)"
                  fontSize={node.count > 9 ? "14" : "15"}
                  fontWeight="700"
                >
                  {node.count}
                </text>
                <title>{describeNode(node)}</title>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
          {focusedNode ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="major">Fookus</Badge>
                <Badge variant="neutral">
                  {dimensionStyles[focusedNode.dimension as keyof typeof dimensionStyles].label}
                </Badge>
              </div>
              <p className="mt-3 text-lg font-semibold text-[var(--color-text)]">{focusedNode.label}</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Selle väärarusaamaga on seotud {focusedNode.count} {focusedNode.count === 1 ? "õpilane" : "õpilast"}.
                Klõps hoiab tabelis alles ainult selle mustriga lahendused.
              </p>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral">Kuidas lugeda</Badge>
              </div>
              <p className="mt-3 text-lg font-semibold text-[var(--color-text)]">
                Punkti suurus näitab, kui paljud õpilased samasse sõlme jõuavad.
              </p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Täisjoon ühendab väärarusaamu, mis ilmuvad samades lahendustes. Katkendlik joon on tuletatud
                teema struktuurist.
                Klõps mõnel sõlmel ja all olev tabel filtreerub kohe selle ümber.
              </p>
            </>
          )}
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Tugevamad seosed
          </p>
          <ul className="mt-3 space-y-3 text-sm text-[var(--color-text)]">
            {(focusedCode ? connectedLinks : graph.links)
              .slice()
              .sort((left, right) => right.weight - left.weight || right.support - left.support)
              .slice(0, 3)
              .map((link) => (
                <li key={link.id}>
                  <span className="font-medium">
                    {getMisconceptionDisplay(link.source, "et").label}
                  </span>{" "}
                  ·{" "}
                  <span className="font-medium">
                    {getMisconceptionDisplay(link.target, "et").label}
                  </span>
                  <span className="block text-[var(--color-text-muted)]">
                    {describeRelationSupport(link.kind, link.support)}
                  </span>
                </li>
              ))}
            {graph.links.length === 0 ? (
              <li className="text-[var(--color-text-muted)]">
                Seosed täituvad siis, kui klassis korduvad samad väärarusaamad.
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
