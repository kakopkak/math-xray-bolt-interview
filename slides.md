---
theme: default
class: text-left
transition: fade-out
title: Math X-Ray Bolt Interview
colorSchema: light
canvasWidth: 1440
---

<div class="h-full grid grid-cols-2 gap-10 items-center" style="font-family: 'Avenir Next', 'Helvetica Neue', sans-serif;">
  <div>
    <div class="uppercase tracking-[0.28em] text-[0.7rem] font-semibold text-indigo-600">Bolt Interview · Small Real AI Solution</div>
    <h1 class="mt-4 leading-[0.92] text-6xl font-black text-slate-900" style="font-family: Georgia, 'Times New Roman', serif;">
      A Small, Real AI Solution<br />for Teacher Next Steps
    </h1>
    <p class="mt-5 text-xl text-slate-600 max-w-xl">
      Math X-Ray's “next move” experiment turns repeated student mistakes into one focused follow-up problem a teacher can use in the next lesson.
    </p>
    <div class="mt-7 flex gap-3 text-sm">
      <div class="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 font-medium text-indigo-700">Bounded scope</div>
      <div class="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 font-medium text-slate-700">Teacher review stays in the loop</div>
    </div>
    <p class="mt-8 text-base font-medium text-slate-700">[YOUR NAME] · [YOUR ROLE]</p>
  </div>

  <div class="rounded-[28px] border border-slate-200 bg-white p-4 shadow-2xl shadow-indigo-100/50">
    <img src="/images/koosrada-teacher-dashboard.png" class="w-full rounded-[20px]" />
    <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
      <div class="rounded-2xl bg-slate-50 px-4 py-3 text-slate-700">
        Real product context
      </div>
      <div class="rounded-2xl bg-indigo-50 px-4 py-3 text-indigo-700">
        Real screenshots, not mockups
      </div>
    </div>
  </div>
</div>

<!--
This project is called Math X-Ray. It is a broader classroom analytics tool, but for this interview I would narrow the story to one small feature.

That feature is the next-move generator. After student work is clustered by repeated mistakes, the system suggests one next whole-class problem a teacher can use in the next lesson.

That scale fits the exercise because it is practical, bounded, and still leaves the teacher in control.
-->

---
layout: two-cols
transition: fade-out
---

<div style="font-family: 'Avenir Next', 'Helvetica Neue', sans-serif;">
  <div class="uppercase tracking-[0.25em] text-[0.7rem] font-semibold text-indigo-600">1 · Problem</div>
  <h1 class="mt-3 text-4xl font-black text-slate-900" style="font-family: Georgia, 'Times New Roman', serif;">Teachers need the next lesson move, not just more data</h1>
  <div class="mt-6 space-y-4 text-lg text-slate-700">
    <div class="rounded-2xl border border-slate-200 bg-white px-5 py-4">
      Looking at final answers alone hides <span class="font-semibold">where the thinking broke</span>.
    </div>
    <div class="rounded-2xl border border-slate-200 bg-white px-5 py-4">
      By the time patterns are obvious, the class has usually <span class="font-semibold">already practiced the misconception</span>.
    </div>
    <div class="rounded-2xl border border-slate-200 bg-white px-5 py-4">
      The practical question is: <span class="font-semibold">what should I ask next lesson to address the pattern?</span>
    </div>
  </div>
</div>

::right::

<div class="rounded-[28px] border border-slate-200 bg-white p-4 shadow-xl shadow-indigo-100/40" style="font-family: 'Avenir Next', 'Helvetica Neue', sans-serif;">
  <img src="/images/koosrada-landing.png" class="w-full rounded-[20px]" />
  <p class="mt-4 text-sm text-slate-500">
    The public site already frames the real problem well: catch misconceptions before they harden.
  </p>
</div>

<!--
The problem I would describe is not grading with AI. It is deciding what to do next with the whole class.

A teacher can often see that some students are wrong, but that still does not answer the practical question of what to ask or reteach in the next lesson.

If several students share the same misconception, the teacher needs a focused intervention, not just another chart. This feature tries to shrink that gap between diagnosis and action.
-->

---
transition: fade-out
---

<div class="uppercase tracking-[0.25em] text-[0.7rem] font-semibold text-indigo-600" style="font-family: 'Avenir Next', 'Helvetica Neue', sans-serif;">2 · Breakdown</div>
<h1 class="mt-3 text-4xl font-black text-slate-900" style="font-family: Georgia, 'Times New Roman', serif;">What AI is good at here, and what it is not</h1>

<div class="mt-8 grid grid-cols-2 gap-6" style="font-family: 'Avenir Next', 'Helvetica Neue', sans-serif;">
  <div class="rounded-[28px] border border-emerald-200 bg-emerald-50/70 p-6">
    <div class="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">AI helps with</div>
    <div class="mt-4 grid gap-3 text-lg text-slate-800">
      <div class="flex gap-3">
        <span class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-600"></span>
        <span>Finding repeated error patterns across many submissions</span>
      </div>
      <div class="flex gap-3">
        <span class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-600"></span>
        <span>Turning cluster summaries into one candidate next problem</span>
      </div>
      <div class="flex gap-3">
        <span class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-600"></span>
        <span>Drafting rationale and likely wrong answers fast</span>
      </div>
    </div>
  </div>

  <div class="rounded-[28px] border border-amber-200 bg-amber-50/80 p-6">
    <div class="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Human judgment still matters</div>
    <div class="mt-4 grid gap-3 text-lg text-slate-800">
      <div class="flex gap-3">
        <span class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-600"></span>
        <span>Is the pattern real or just noisy extraction?</span>
      </div>
      <div class="flex gap-3">
        <span class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-600"></span>
        <span>Is the generated problem appropriate for this class right now?</span>
      </div>
      <div class="flex gap-3">
        <span class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-600"></span>
        <span>Should the teacher intervene whole-class, small-group, or not at all?</span>
      </div>
    </div>
  </div>
</div>

<div class="mt-6 rounded-2xl bg-slate-900 px-5 py-4 text-base text-slate-100" style="font-family: 'Avenir Next', 'Helvetica Neue', sans-serif;">
  Boundary: AI can propose a next move. The teacher still owns the decision.
</div>

<!--
This is the part I would emphasize most, because it shows I am not treating AI as magic.

AI is useful here because it can summarize patterns and draft a candidate teaching move quickly.

But once that output affects classroom action, human judgment matters again. The teacher knows the pacing of the class and whether the signal is trustworthy enough to act on.

So the feature is designed as a proposal, not an autopilot.
-->

---
layout: two-cols
transition: fade-out
---

<div style="font-family: 'Avenir Next', 'Helvetica Neue', sans-serif;">
  <div class="uppercase tracking-[0.25em] text-[0.7rem] font-semibold text-indigo-600">3 · What I Created</div>
  <h1 class="mt-3 text-4xl font-black text-slate-900" style="font-family: Georgia, 'Times New Roman', serif;">A small “next move” generator inside a larger product</h1>

  <div class="mt-6 grid gap-4">
    <div class="rounded-2xl border border-slate-200 bg-white px-5 py-4">
      <div class="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">What it does</div>
      <p class="mt-2 text-lg text-slate-800">Suggests one next whole-class problem based on the current misconception distribution.</p>
    </div>
    <div class="rounded-2xl border border-slate-200 bg-white px-5 py-4">
      <div class="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">What it returns</div>
      <p class="mt-2 text-lg text-slate-800">Prompt, rationale, expected error patterns, and a teacher move in Estonian.</p>
    </div>
    <div class="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
      <div class="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">What I deliberately left out</div>
      <p class="mt-2 text-lg text-slate-800">No automatic lesson planning, no fully autonomous intervention, no fake confidence that the suggestion is always right.</p>
    </div>
  </div>

  <div class="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-lg text-indigo-800">
    Current result: <span class="font-semibold">[YOUR RESULT]</span>
  </div>
</div>

::right::

<div class="rounded-[28px] border border-slate-200 bg-white p-4 shadow-xl shadow-indigo-100/40" style="font-family: 'Avenir Next', 'Helvetica Neue', sans-serif;">
  <img src="/images/koosrada-teacher-dashboard.png" class="w-full rounded-[20px]" />
  <p class="mt-4 text-sm text-slate-500">
    Real teacher context from the live dashboard. The feature I am presenting is one layer inside this broader workflow.
  </p>
</div>

<!--
What I built for this story is intentionally small.

Math X-Ray already has a broader pipeline for extracting steps, labeling misconceptions, and clustering patterns. The piece I am isolating here is the next-move generator: given the class-level pattern, produce one candidate follow-up problem plus a rationale and likely mistakes.

I also want to be explicit about scope. I did not try to automate the whole teaching workflow, and I kept the teacher in control.
-->

---
transition: fade-out
---

<div class="h-full" style="font-family: 'Avenir Next', 'Helvetica Neue', sans-serif;">
  <div class="uppercase tracking-[0.25em] text-[0.7rem] font-semibold text-indigo-600">4 · Workflow / System</div>
  <h1 class="mt-3 text-4xl font-black text-slate-900" style="font-family: Georgia, 'Times New Roman', serif;">Simple flow, with one review gate that matters</h1>

  <div class="mt-8 rounded-[30px] border border-slate-200 bg-white p-6 shadow-xl shadow-indigo-100/30">
    <img src="/images/next-move-workflow.svg" class="w-full" />
  </div>

  <div class="mt-6 grid grid-cols-3 gap-4 text-base">
    <div class="rounded-2xl bg-slate-50 px-4 py-4 text-slate-700">Upstream steps can be imperfect, so later outputs must stay reviewable.</div>
    <div class="rounded-2xl bg-slate-50 px-4 py-4 text-slate-700">The model is constrained by taxonomy codes and structured output.</div>
    <div class="rounded-2xl bg-indigo-50 px-4 py-4 text-indigo-800">The teacher review is not decoration. It is the product boundary.</div>
  </div>
</div>

<!--
The system is straightforward on purpose.

Student work first becomes step-level data. That gets labeled with misconception codes and grouped into class patterns. Then the model receives a constrained prompt and returns one candidate next problem, expected wrong answers, and a teacher move.

The most important box in this slide is the last one: teacher review. The point is to reduce decision friction, not remove the teacher from the loop.
-->

---
transition: fade-out
---

<div class="h-full" style="font-family: 'Avenir Next', 'Helvetica Neue', sans-serif;">
  <div class="uppercase tracking-[0.25em] text-[0.7rem] font-semibold text-indigo-600">5 · AI Usage</div>
  <h1 class="mt-3 text-4xl font-black text-slate-900" style="font-family: Georgia, 'Times New Roman', serif;">I used AI as a constrained collaborator</h1>

  <div class="mt-8 grid grid-cols-3 gap-5">
    <div class="rounded-[26px] border border-slate-200 bg-white p-5">
      <div class="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Prompting</div>
      <p class="mt-3 text-lg text-slate-800">I gave the model the class distribution, valid taxonomy codes, and a strict JSON shape.</p>
    </div>
    <div class="rounded-[26px] border border-slate-200 bg-white p-5">
      <div class="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Iteration</div>
      <p class="mt-3 text-lg text-slate-800">I tightened outputs around one problem only, short rationale, and expected errors per cluster.</p>
    </div>
    <div class="rounded-[26px] border border-slate-200 bg-white p-5">
      <div class="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Guardrails</div>
      <p class="mt-3 text-lg text-slate-800">I filtered invalid codes, excluded no-error clusters, and kept a deterministic fallback when generation failed.</p>
    </div>
  </div>

  <div class="mt-7 rounded-2xl bg-slate-900 px-5 py-4 text-base text-slate-100">
    Repo-evident pattern: structure first, model second, review always.
  </div>
</div>

<!--
For the AI usage section, I would be concrete rather than saying “I used AI to build it.”

Inside the feature, the model gets the class distribution, the allowed misconception codes, and a strict output format. That reduces drift and makes the output easier to validate.

The other important part is what happens when the model does not behave well. The code filters invalid codes, ignores irrelevant clusters, and falls back to a deterministic option. That is the kind of structured AI collaboration I trust more than a free-form answer.
-->

---
transition: fade-out
---

<div class="h-full" style="font-family: 'Avenir Next', 'Helvetica Neue', sans-serif;">
  <div class="uppercase tracking-[0.25em] text-[0.7rem] font-semibold text-indigo-600">6 · Reflection</div>
  <h1 class="mt-3 text-4xl font-black text-slate-900" style="font-family: Georgia, 'Times New Roman', serif;">What still does not work well enough</h1>

  <div class="mt-8 grid grid-cols-2 gap-5 text-lg">
    <div class="rounded-[26px] border border-slate-200 bg-white p-5 text-slate-800">If upstream extraction is weak, the “next move” can be well-written but based on shaky evidence.</div>
    <div class="rounded-[26px] border border-slate-200 bg-white p-5 text-slate-800">Language quality matters because the output is meant to be classroom-ready, not just technically valid.</div>
    <div class="rounded-[26px] border border-slate-200 bg-white p-5 text-slate-800">A single class-level suggestion may still be wrong for timing, pacing, or teacher intent.</div>
    <div class="rounded-[26px] border border-amber-200 bg-amber-50 p-5 text-slate-800">Trust is the hardest part. If the teacher cannot tell why the suggestion appeared, they will ignore it.</div>
  </div>
</div>

<!--
The honest reflection is that this feature is only as good as the signal it receives.

If earlier stages misread student work, the next suggestion can sound convincing while still being built on noise. That is a classic AI failure mode.

The other big issue is trust. Even if the suggestion is reasonable, a teacher still needs to understand why this move is being recommended now. Without that, the feature becomes decorative rather than useful.
-->

---
transition: fade-out
---

<div class="h-full" style="font-family: 'Avenir Next', 'Helvetica Neue', sans-serif;">
  <div class="uppercase tracking-[0.25em] text-[0.7rem] font-semibold text-indigo-600">7 · Next Improvements</div>
  <h1 class="mt-3 text-4xl font-black text-slate-900" style="font-family: Georgia, 'Times New Roman', serif;">Three improvements that would actually matter</h1>

  <div class="mt-8 grid grid-cols-3 gap-5">
    <div class="rounded-[26px] border border-slate-200 bg-white p-5">
      <div class="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">1</div>
      <p class="mt-3 text-lg text-slate-800">Show the evidence behind each suggestion more clearly, especially which clusters drove it.</p>
    </div>
    <div class="rounded-[26px] border border-slate-200 bg-white p-5">
      <div class="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">2</div>
      <p class="mt-3 text-lg text-slate-800">Let teachers compare two candidate next moves instead of accepting one default answer.</p>
    </div>
    <div class="rounded-[26px] border border-slate-200 bg-white p-5">
      <div class="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">3</div>
      <p class="mt-3 text-lg text-slate-800">Track whether the suggested follow-up actually improved the next round of student work.</p>
    </div>
  </div>
</div>

<!--
The next steps I care about are not “add more AI.”

First, I would improve the evidence trail so the teacher can see which cluster pattern produced the recommendation. Second, I would rather offer two good options than pretend there is always one perfect next move. Third, I would measure whether the intervention actually helped in the next round.

Those changes would improve usefulness, not just polish.
-->

---
layout: center
class: text-center
transition: fade-out
---

<div class="max-w-4xl mx-auto" style="font-family: 'Avenir Next', 'Helvetica Neue', sans-serif;">
  <div class="uppercase tracking-[0.25em] text-[0.7rem] font-semibold text-indigo-600">8 · Closing</div>
  <h1 class="mt-4 text-5xl font-black text-slate-900" style="font-family: Georgia, 'Times New Roman', serif;">Small, real AI feels more useful than big, vague AI</h1>
  <p class="mt-6 text-2xl text-slate-600 leading-snug">
    For me, the win here is not “AI teaches math.”<br />
    It is <span class="font-semibold text-slate-900">one concrete suggestion that helps a teacher decide what to do next</span>.
  </p>
  <div class="mt-10 flex justify-center gap-3 text-sm">
    <div class="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 font-medium text-indigo-700">Practical over impressive</div>
    <div class="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 font-medium text-slate-700">Reasoning over hype</div>
  </div>
  <p class="mt-10 text-lg text-slate-500">[YOUR NAME] · [YOUR ROLE]</p>
</div>

<!--
The takeaway I would end on is simple.

This is not a polished AI product story. It is a small experiment aimed at one real teaching decision: what should happen in the next lesson when a pattern shows up across the class?

That feels like the right scale for the exercise because it is practical, bounded, and honest about tradeoffs. If I kept going, I would spend more time improving trust and evidence than adding more surface area.
-->
