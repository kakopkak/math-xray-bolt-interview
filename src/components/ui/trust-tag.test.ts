import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TrustTag, getTrustExplanation } from "./trust-tag";

test("TrustTag hides high-trust AI rows by default", () => {
  const markup = renderToStaticMarkup(
    createElement(TrustTag, {
      level: "high",
      extractionSource: "ai",
    })
  );

  assert.equal(markup, "");
});

test("TrustTag renders caution states with teacher-facing copy", () => {
  const heuristicMarkup = renderToStaticMarkup(
    createElement(TrustTag, {
      level: "medium",
      extractionSource: "heuristic",
    })
  );
  const lowTrustMarkup = renderToStaticMarkup(
    createElement(TrustTag, {
      level: "low",
      extractionSource: "ai",
    })
  );

  assert.match(heuristicMarkup, /Automaatne lugemine/);
  assert.match(lowTrustMarkup, /Kontrolli üle/);
});

test("TrustTag explanations stay teacher-facing and Estonian", () => {
  assert.match(getTrustExplanation("medium", "ai"), /AI luges lahenduse/);
  assert.match(getTrustExplanation("low", "heuristic"), /Kontrolli üle/);
});

test("TrustTag can display voice reasoning availability cue", () => {
  const voiceMarkup = renderToStaticMarkup(
    createElement(TrustTag, {
      level: "medium",
      extractionSource: "ai",
      hasVoiceReasoning: true,
    })
  );

  assert.match(voiceMarkup, /Hääl olemas/);
});
