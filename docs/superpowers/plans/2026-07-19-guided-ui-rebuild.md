# Guided UI Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the M-Data frontend into a welcoming guided analytics workspace with stronger upload guidance, clearer navigation, professional visuals, and more obvious export/download paths.

**Architecture:** Keep the existing backend APIs and analytics contracts. Add small frontend export helpers, refine the existing upload panel in place, add focused UI components for hero/readiness/action cards, and replace the busiest styling with a calmer workspace visual system.

**Tech Stack:** TypeScript, React 18, Vite, Recharts, XLSX, existing CSS.

## Global Constraints

- Preserve supported uploads: CSV, TSV, TXT, JSON, XLS, XLSX, XLSM, and XLSB.
- Preserve dashboard CSV/JSON exports.
- Preserve filtered Excel exports.
- Add upload analysis JSON export and analysis workbook export after upload.
- Keep advanced analytics methods and compatibility behavior intact.
- Keep PWA install messaging and tenant branding intact.
- Use native semantic controls and responsive layouts.
- Verify with typecheck, focused analytics tests, and production build.

---

## File Structure

- Create `src/lib/uploadExports.ts`: frontend helpers for upload analysis JSON and compact analysis workbook downloads.
- Create `src/components/WorkspaceHero.tsx`: welcoming status header with quick actions.
- Create `src/components/DatasetReadiness.tsx`: dataset status, supported file types, and readiness indicators.
- Modify `src/components/CommandOverview.tsx`: delegate friendly hero/action layout to new components.
- Modify `src/components/UploadAnalysisPanel.tsx`: improve copy/layout, call upload completion callback, add analyzed summary/workbook downloads, preserve filtered Excel downloads.
- Modify `src/components/WorkbenchNav.tsx`: friendly labels and active state copy.
- Modify `src/components/AnalysisStudio.tsx`: group methods into approachable categories and improve empty states.
- Modify `src/components/ReportBuilder.tsx`: polish builder controls and add report config export affordance.
- Modify `src/components/ExportsHub.tsx`: add upload analysis JSON/workbook exports and clearer disabled states.
- Modify `src/App.tsx`: use refined overview/data/analyze/report/export flows without changing API behavior.
- Modify `src/styles.css`: calmer palette, reduced visual noise, improved grids, responsive polish.

## Task 1: Upload Export Helpers

**Files:**
- Create: `src/lib/uploadExports.ts`

**Interfaces:**
- Produces: `downloadUploadAnalysisJson(analysis: UploadAnalysisResponse): void`.
- Produces: `downloadAnalysisWorkbook(analysis: UploadAnalysisResponse): void`.

- [ ] Create helper to download latest upload analysis as JSON.
- [ ] Create helper to build an XLSX workbook with sheets for metrics, columns, methods, results, filtered views, and recommendations.
- [ ] Ensure workbook sheets use compact summary data, not full raw dataset dumps.

## Task 2: Friendly Overview Components

**Files:**
- Create: `src/components/WorkspaceHero.tsx`
- Create: `src/components/DatasetReadiness.tsx`
- Modify: `src/components/CommandOverview.tsx`

**Interfaces:**
- Consumes: app/company names, dashboard data, latest upload, loading state, navigation callback.
- Produces: welcoming first screen with quick actions and readiness indicators.

- [ ] Add `WorkspaceHero` with headline, supportive copy, quick action buttons, and dataset status.
- [ ] Add `DatasetReadiness` with supported file list and readiness stats.
- [ ] Refactor `CommandOverview` to compose these components and reduce intimidating copy.

## Task 3: Guided Data Page

**Files:**
- Modify: `src/components/UploadAnalysisPanel.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Preserves: `onAnalysisComplete?: (analysis: UploadAnalysisResponse) => void`.

- [ ] Improve upload header and dropzone copy.
- [ ] Show supported file types visibly near upload.
- [ ] Add visible “what M-Data does next” guidance.
- [ ] Add analyzed summary JSON and analysis workbook buttons after upload.
- [ ] Ensure `onAnalysisComplete?.(result)` is called after successful upload.
- [ ] Preserve filtered Excel download buttons.

## Task 4: Friendlier Analysis, Reports, And Exports

**Files:**
- Modify: `src/components/WorkbenchNav.tsx`
- Modify: `src/components/AnalysisStudio.tsx`
- Modify: `src/components/ReportBuilder.tsx`
- Modify: `src/components/ExportsHub.tsx`

**Interfaces:**
- Consumes existing `UploadAnalysisResponse`, dashboard data, and export callbacks.

- [ ] Make nav labels and sublabels more welcoming.
- [ ] Group analysis methods into Explain, Predict, Detect, Compare, and Plan.
- [ ] Improve disabled method explanations.
- [ ] Make report preview feel like a readable report page.
- [ ] Add upload analysis JSON/workbook exports to Exports Hub.
- [ ] Keep unavailable export actions disabled with visible explanatory copy.

## Task 5: Professional Visual System

**Files:**
- Modify: `src/styles.css`

**Interfaces:**
- Produces calmer, responsive UI without changing component contracts.

- [ ] Replace heavy backgrounds with restrained neutral surfaces.
- [ ] Reduce shadows and gradient intensity.
- [ ] Improve spacing, button hierarchy, card density, and table readability.
- [ ] Add responsive rules for new hero/readiness/action grids.
- [ ] Check mobile text wrapping for long file names and button labels.

## Task 6: Verification And Commit

**Files:**
- Modify only files needed to fix verification failures.

- [ ] Run `npm.cmd run typecheck`; expected: pass.
- [ ] Run `.\node_modules\.bin\tsx.cmd --test backend\advancedAnalysisService.test.ts`; expected: 4 passing tests.
- [ ] Run `npm.cmd run build`; expected: pass.
- [ ] Smoke check frontend URL and backend health endpoint.
- [ ] Check git status and commit implementation.

## Self-Review

- Spec coverage: tasks cover welcoming layout, file support copy, exports/downloads, professional visual system, and verification.
- Placeholder scan: no placeholder steps.
- Type consistency: export helper signatures are consumed by upload panel and exports hub.
