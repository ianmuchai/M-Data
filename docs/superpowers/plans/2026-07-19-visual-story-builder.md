# Visual Story Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Reports into a Visual Story Builder that creates visualization previews, presentation slide previews, and downloadable JSON/HTML presentation artifacts from dashboard and uploaded analysis data.

**Architecture:** Add shared story types, implement frontend-only story generation/export helpers, then replace the current ReportBuilder UI with a richer visual/presentation builder while preserving existing dashboard/upload flows.

**Tech Stack:** TypeScript, React 18, Vite, existing CSS.

## Global Constraints

- No new dependencies.
- Preserve upload, analytics, and existing export behavior.
- Support dashboard and latest-upload sources.
- Export story config JSON, presentation outline JSON, and standalone HTML.
- Verify with typecheck, backend tests, production build, and smoke checks.

---

## Task 1: Shared Story Types

**Files:**
- Modify: `shared/analytics.ts`

- [ ] Add story source, visual type, presentation preset, slide, deck, and config types.

## Task 2: Story Builder Helpers

**Files:**
- Create: `src/lib/storyBuilder.ts`

- [ ] Build story preview data from dashboard/upload.
- [ ] Build presentation decks from dashboard/upload.
- [ ] Add JSON and HTML download helpers.

## Task 3: ReportBuilder Upgrade

**Files:**
- Modify: `src/components/ReportBuilder.tsx`

- [ ] Replace report-lite UI with Visual Story Builder controls.
- [ ] Add visualization preview.
- [ ] Add presentation slide selector/preview.
- [ ] Add export buttons for config JSON, outline JSON, and HTML.

## Task 4: Styling

**Files:**
- Modify: `src/styles.css`

- [ ] Add visual story builder layout, chart preview, slide preview, and presentation export styling.

## Task 5: Verification And Commit

- [ ] Run `npm.cmd run typecheck`.
- [ ] Run `.\node_modules\.bin\tsx.cmd --test backend\corsPolicy.test.ts backend\advancedAnalysisService.test.ts`.
- [ ] Run `npm.cmd run build`.
- [ ] Smoke check frontend and backend health.
- [ ] Commit implementation.
