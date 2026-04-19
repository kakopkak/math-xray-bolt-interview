import assert from "node:assert/strict";
import test from "node:test";
import type { AssignmentAnalytics } from "@/lib/assignment-analytics";
import {
  buildRelationGraphData,
  filterStudentsByRelation,
  layoutRelationGraph,
  RELATION_GRAPH_HEIGHT,
  RELATION_GRAPH_WIDTH,
  splitGraphLabel,
} from "./relation-graph";

function createAnalyticsFixture(): AssignmentAnalytics {
  return {
    totalStudents: 4,
    completedCount: 4,
    errorCount: 0,
    misconceptionDistribution: [
      {
        code: "QE_SIGN_ERROR",
        label: "Sign error when solving",
        labelEt: "Märgiviga lahendamisel",
        severity: "major",
        count: 3,
        percentage: 75,
      },
      {
        code: "QE_ARITHMETIC",
        label: "Basic arithmetic error",
        labelEt: "Arvutusviga",
        severity: "minor",
        count: 2,
        percentage: 50,
      },
      {
        code: "QE_INCOMPLETE_FACTOR",
        label: "Incomplete or incorrect factoring",
        labelEt: "Puudulik või vale tegurdamine",
        severity: "major",
        count: 1,
        percentage: 25,
      },
    ],
    classIntelligence: {
      pulse: {
        highPriorityReviewCount: 2,
        highUncertaintyCount: 1,
        earlyBreakdownCount: 1,
        divergenceCount: 1,
      },
      actionQueue: [],
      misconceptionRelations: [
        {
          sourceCode: "QE_SIGN_ERROR",
          targetCode: "QE_ARITHMETIC",
          kind: "co_occurs",
          weight: 0.5,
          support: 2,
        },
        {
          sourceCode: "QE_INCOMPLETE_FACTOR",
          targetCode: "QE_SIGN_ERROR",
          kind: "depends_on",
          weight: 0.25,
          support: 1,
        },
      ],
      rootConceptPressure: [],
      recurrence: {
        recurringStudentsCount: 1,
        recurringStudentsShare: 25,
        persistentMisconceptionCount: 1,
      },
      remediationEffect: null,
    },
    allStudents: [
      {
        id: "1",
        submissionId: "1",
        createdAt: null,
        name: "Anna",
        studentKey: "anna",
        primaryMisconception: "QE_SIGN_ERROR",
        misconceptions: ["QE_SIGN_ERROR", "QE_ARITHMETIC"],
        primaryMisconceptionLabelEt: "Märgiviga lahendamisel",
        severityScore: 5,
        processingStatus: "complete",
        analysisMeta: null,
        dataQuality: null,
        intelligence: null,
        teacherReview: null,
      },
      {
        id: "2",
        submissionId: "2",
        createdAt: null,
        name: "Boris",
        studentKey: "boris",
        primaryMisconception: "QE_ARITHMETIC",
        misconceptions: ["QE_ARITHMETIC"],
        primaryMisconceptionLabelEt: "Arvutusviga",
        severityScore: 2,
        processingStatus: "complete",
        analysisMeta: null,
        dataQuality: null,
        intelligence: null,
        teacherReview: null,
      },
      {
        id: "3",
        submissionId: "3",
        createdAt: null,
        name: "Carmen",
        studentKey: "carmen",
        primaryMisconception: "QE_INCOMPLETE_FACTOR",
        misconceptions: ["QE_INCOMPLETE_FACTOR", "QE_SIGN_ERROR"],
        primaryMisconceptionLabelEt: "Puudulik või vale tegurdamine",
        severityScore: 4,
        processingStatus: "complete",
        analysisMeta: null,
        dataQuality: null,
        intelligence: null,
        teacherReview: null,
      },
    ],
  };
}

test("relation graph uses distribution counts for node sizing and link kinds", () => {
  const graph = buildRelationGraphData(createAnalyticsFixture());

  assert.equal(graph.nodes.length, 3);
  assert.equal(graph.links.length, 2);
  assert.equal(graph.nodes[0]?.id, "QE_SIGN_ERROR");
  assert.equal(graph.nodes[0]?.count, 3);
  assert.equal(graph.nodes[0]?.dimension, "procedural");
  assert.equal(graph.links[0]?.kind, "co_occurs");
  assert.equal(graph.links[1]?.kind, "depends_on");
});

test("relation graph layout stays inside the canvas bounds", () => {
  const positioned = layoutRelationGraph(buildRelationGraphData(createAnalyticsFixture()));

  for (const node of positioned.nodes) {
    assert.ok(node.x >= node.radius);
    assert.ok(node.x <= RELATION_GRAPH_WIDTH - node.radius);
    assert.ok(node.y >= node.radius);
    assert.ok(node.y <= RELATION_GRAPH_HEIGHT - node.radius);
  }
});

test("student filtering respects any misconception in the stored list", () => {
  const analytics = createAnalyticsFixture();

  const filtered = filterStudentsByRelation(analytics.allStudents, "QE_SIGN_ERROR");

  assert.deepEqual(
    filtered.map((student) => student.name),
    ["Anna", "Carmen"]
  );
});

test("graph labels wrap to two readable lines", () => {
  assert.deepEqual(splitGraphLabel("Puudulik või vale tegurdamine", 14, 2), [
    "Puudulik või",
    "vale tegurdam…",
  ]);
});
