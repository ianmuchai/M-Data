# Balanced Analytics Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive first-release analytics workbench with modern navigation, advanced method selection, lightweight report building, and centralized exports while preserving the current dashboard and upload intelligence.

**Architecture:** Add shared result types and a focused backend `advancedAnalysisService` that computes method compatibility and compact analysis results from uploaded rows and profiles. Integrate those results into the existing upload response, then restructure the React app into navigable sections that reuse current components and add Analyze, Reports, and Exports workspaces.

**Tech Stack:** TypeScript, React 18, Vite, Express, Recharts, XLSX, existing CSS.

## Global Constraints

- Retain existing upload intelligence, filtered Excel exports, PWA behavior, tenant branding, and dashboard metrics.
- Support both uploaded datasets and built-in dashboard data in the product shell.
- Include regression, correlation, forecasting, anomaly detection, segmentation, distribution, trend, ranking, and what-if scenarios.
- Enable methods only when suitable fields exist and show clear disabled reasons otherwise.
- Avoid new dependencies unless they materially reduce complexity or improve correctness.
- Keep computation bounded for large uploads and return concise payloads.
- Verify with typecheck and production build.

---

## File Structure

- Modify `shared/analytics.ts`: add advanced analytics, compatibility, report builder, and export hub types.
- Create `backend/advancedAnalysisService.ts`: pure calculation functions for all first-release methods.
- Modify `backend/uploadAnalysisService.ts`: call advanced analysis after profiling and include results in upload response.
- Modify `src/components/UploadAnalysisPanel.tsx`: accept an optional callback when upload analysis completes; preserve current UI.
- Create `src/components/WorkbenchNav.tsx`: section navigation shell.
- Create `src/components/CommandOverview.tsx`: overview command center using dashboard and upload summaries.
- Create `src/components/AnalysisStudio.tsx`: method cards, parameter controls, and results.
- Create `src/components/ReportBuilder.tsx`: lightweight report controls and preview.
- Create `src/components/ExportsHub.tsx`: centralized export actions and filtered Excel entry points.
- Modify `src/App.tsx`: hold active section and latest upload state, route sections, pass data to new components.
- Modify `src/styles.css`: modern navigation, section layout, analysis studio, report builder, and export hub styles.

## Task 1: Shared Analytics Contracts

**Files:**
- Modify: `shared/analytics.ts`

**Interfaces:**
- Produces: `AdvancedAnalysisMethod`, `AdvancedAnalysisResult`, `AdvancedAnalyticsSummary`, `ReportBuilderConfig`, `ReportBuilderPreview`.

- [ ] Add method and report types to `shared/analytics.ts`.
- [ ] Extend `UploadAnalysisResponse` with `advancedAnalytics: AdvancedAnalyticsSummary`.
- [ ] Run `npm run typecheck`; expected result may fail until backend/frontend consumers are implemented.

## Task 2: Backend Advanced Analysis Engine

**Files:**
- Create: `backend/advancedAnalysisService.ts`
- Modify: `backend/uploadAnalysisService.ts`

**Interfaces:**
- Consumes: `DataRow`-compatible rows, `ColumnProfile[]`.
- Produces: `buildAdvancedAnalytics(rows, columns): AdvancedAnalyticsSummary`.

- [ ] Implement numeric/date/category helpers, Pearson correlation, simple linear regression, moving-average forecast, IQR anomaly detection, segment aggregation, distribution buckets, trend aggregation, ranking, and what-if summaries.
- [ ] Add compatibility records for every method whether enabled or disabled.
- [ ] Cap row previews and result arrays to compact sizes.
- [ ] Wire `buildAdvancedAnalytics(rows, columns)` into `analyzeUpload`.
- [ ] Run `npm run typecheck`; expected result should pass after frontend type updates.

## Task 3: Upload State Handoff

**Files:**
- Modify: `src/components/UploadAnalysisPanel.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `onAnalysisComplete?: (analysis: UploadAnalysisResponse) => void`.

- [ ] Add optional `onAnalysisComplete` prop to `UploadAnalysisPanel`.
- [ ] Call it after successful upload analysis.
- [ ] Store latest upload in `App.tsx`.
- [ ] Preserve all existing upload UI, selected option, selected filter, and Excel export behavior.

## Task 4: Modern Navigation And Overview

**Files:**
- Create: `src/components/WorkbenchNav.tsx`
- Create: `src/components/CommandOverview.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: section keys `overview | data | analyze | reports | exports`.

- [ ] Add section navigation.
- [ ] Move existing dashboard panels into Overview.
- [ ] Show quick actions that switch to Data, Analyze, Reports, and Exports.
- [ ] Keep dashboard controls and refresh/export actions working.

## Task 5: Analysis Studio

**Files:**
- Create: `src/components/AnalysisStudio.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `UploadAnalysisResponse | null`.
- Produces: user-visible method cards, parameter controls, result metrics, charts/tables, warnings, and recommendations.

- [ ] Show all nine methods with enabled/disabled state.
- [ ] Default to the first enabled method after upload.
- [ ] Render method-specific controls using suggested fields.
- [ ] Render result cards and compact tables.
- [ ] Show useful empty states before upload and for unsupported methods.

## Task 6: Report Builder Lite

**Files:**
- Create: `src/components/ReportBuilder.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: dashboard analytics and latest upload analysis.
- Produces: in-memory `ReportBuilderConfig` and `ReportBuilderPreview`.

- [ ] Add data-source, chart-type, metric, dimension, filter, and layout controls.
- [ ] Build preview cards from dashboard metrics or upload analysis results.
- [ ] Show recommended visuals and limitations when fields are missing.

## Task 7: Exports Hub

**Files:**
- Create: `src/components/ExportsHub.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: dashboard data, latest upload analysis, and existing export functions.

- [ ] Centralize dashboard CSV/JSON export buttons.
- [ ] Show upload filtered export inventory.
- [ ] Show report configuration export as JSON.
- [ ] Disable unavailable actions with explanations.

## Task 8: Verification And Finish

**Files:**
- Modify only files needed to fix verification failures.

- [ ] Run `npm run typecheck`; expected: pass.
- [ ] Run `npm run build`; expected: pass.
- [ ] Start dev server if needed and inspect the main flows.
- [ ] Check `git status --short` and summarize changed files.
- [ ] Commit implementation after verification.

## Self-Review

- Spec coverage: all sections map to tasks above.
- Placeholder scan: no TBD/TODO/fill-in markers.
- Type consistency: shared types are produced before backend/frontend consumers.
