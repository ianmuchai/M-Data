# Vibrant Professional UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a vibrant, professional, data-driven visual layer to the existing guided M-Data workspace.

**Architecture:** Keep APIs and existing workflows intact. Enhance `WorkspaceHero`, `CommandOverview`, `DatasetReadiness`, and section styling with data-backed visual elements and semantic status classes.

**Tech Stack:** TypeScript, React 18, Vite, existing CSS.

## Global Constraints

- Do not add dependencies.
- Preserve all upload types and export actions.
- Use dashboard/upload data to drive visual accents.
- Keep the UI professional, responsive, and readable.
- Verify with typecheck, tests, build, and smoke checks.

---

## Task 1: Data-Driven Hero

**Files:**
- Modify: `src/components/WorkspaceHero.tsx`

- [ ] Add score, method count, export count, quality state, and mini trend bars derived from dashboard/upload props.
- [ ] Keep quick actions intact.

## Task 2: Readiness And Workflow Visuals

**Files:**
- Modify: `src/components/DatasetReadiness.tsx`
- Modify: `src/components/CommandOverview.tsx`

- [ ] Add readiness classes based on quality score.
- [ ] Add workflow card accent classes and concise data-backed labels.

## Task 3: Section Vibrancy

**Files:**
- Modify: `src/components/AnalysisStudio.tsx`
- Modify: `src/components/ReportBuilder.tsx`
- Modify: `src/components/ExportsHub.tsx`

- [ ] Add method group accent classes.
- [ ] Improve report preview and download cards with richer styling hooks.

## Task 4: Visual System CSS

**Files:**
- Modify: `src/styles.css`

- [ ] Add vibrant color tokens and data visual styles.
- [ ] Enhance hero, cards, method groups, reports, exports, and responsive behavior.

## Task 5: Verification And Commit

- [ ] Run `npm.cmd run typecheck`.
- [ ] Run `.\node_modules\.bin\tsx.cmd --test backend\corsPolicy.test.ts backend\advancedAnalysisService.test.ts`.
- [ ] Run `npm.cmd run build`.
- [ ] Smoke check frontend and backend health.
- [ ] Commit implementation.
