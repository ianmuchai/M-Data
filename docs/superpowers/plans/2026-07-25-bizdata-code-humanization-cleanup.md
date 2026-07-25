# BizDATA Code Humanization Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean and humanize BizDATA code and copy while preserving current analytics, uploads, reports, chatbot, and export behavior.

**Architecture:** Add a small shared value-normalization helper, replace scattered blank-value fallbacks with that helper, and make the most visible UI copy clearer. Keep existing module structure mostly intact to avoid a risky rewrite, but remove dead imports/exports and strengthen tests around the cleanup.

**Tech Stack:** React 18, TypeScript, Vite, Express, Node test runner via `tsx`, XLSX/read-excel-file, Recharts.

## Global Constraints

- Preserve working behavior and current feature breadth.
- Prefer small helper extraction over broad rewrites.
- Use plain business language for user-facing copy.
- Treat blank, null-like, N/A, and placeholder values as missing data, not measurable segments or ranking labels.
- Keep report downloads on the Reports page limited to PDF and PPT presentation exports.
- Keep spreadsheet downloads elsewhere intact.
- Avoid adding dependencies unless a feature cannot be maintained safely without one.
- Verify with TypeScript, production build, and focused backend tests before committing.
- Do not touch the pre-existing unstaged `backend/corsPolicy.ts` change.

---

### Task 1: Shared Missing-Value Helper

**Files:**
- Create: `shared/valueGuards.ts`
- Modify: `backend/uploadAnalysisService.ts`
- Modify: `backend/advancedAnalysisService.ts`
- Modify: `src/components/UploadAnalysisPanel.tsx`
- Modify: `src/components/DataAssistant.tsx`
- Modify: `src/lib/storyBuilder.ts`

**Interfaces:**
- Produces: `stringifyCell(value: unknown): string`, `isMissingBusinessValue(value: unknown): boolean`, `hasBusinessValue(value: unknown): boolean`, `businessValueOrNull(value: unknown): string | null`.
- Consumes: Existing row values from backend and frontend analysis paths.

- [ ] **Step 1: Create shared helper**

```ts
const missingValueLabels = new Set(['', 'blank', 'n/a', 'na', 'null', 'undefined', '-', '--', 'none', 'not applicable']);

export function stringifyCell(value: unknown): string {
  return String(value ?? '').trim();
}

export function isMissingBusinessValue(value: unknown): boolean {
  return missingValueLabels.has(stringifyCell(value).toLowerCase());
}

export function hasBusinessValue(value: unknown): boolean {
  return !isMissingBusinessValue(value);
}

export function businessValueOrNull(value: unknown): string | null {
  const text = stringifyCell(value);
  return isMissingBusinessValue(text) ? null : text;
}
```

- [ ] **Step 2: Replace duplicate local blank checks**

Use `hasBusinessValue` and `businessValueOrNull` in the files listed above. Keep local `formatValue` functions where they format numbers only.

- [ ] **Step 3: Run typecheck**

Run: `npm.cmd run typecheck`
Expected: exit code 0.

---

### Task 2: Backend Blank Handling Coverage

**Files:**
- Modify: `backend/advancedAnalysisService.ts`
- Modify: `backend/advancedAnalysisService.test.ts`
- Modify: `backend/uploadAnalysisService.test.ts` only if shared helper imports require test adjustment.

**Interfaces:**
- Consumes: `businessValueOrNull` from `shared/valueGuards.ts`.
- Produces: advanced analytics segmentation and ranking results with no `Blank`, `N/A`, `null`, `undefined`, `-`, or empty labels.

- [ ] **Step 1: Add advanced analytics regression test**

Add a test that builds rows with blank and N/A segment labels plus valid labels, then asserts segmentation and ranking series do not include missing labels.

```ts
assert.equal(
  result.results.flatMap((item) => item.series.map((point) => point.name)).some((name) => /^(blank|n\/a|na|null|undefined|-|)$/i.test(String(name).trim())),
  false,
);
```

- [ ] **Step 2: Update segmentation and ranking functions**

Replace `(row[segment.name] || 'Blank').slice(0, 80)` and `(row[dimension.name] || 'Blank').slice(0, 80)` with `businessValueOrNull(row[segment.name])` / `businessValueOrNull(row[dimension.name])`, skipping rows where the result is null.

- [ ] **Step 3: Run backend tests**

Run: `npx.cmd tsx backend\advancedAnalysisService.test.ts`
Expected: all tests pass.

Run: `npx.cmd tsx backend\uploadAnalysisService.test.ts`
Expected: all tests pass.

---

### Task 3: Humanize Frontend Copy and Labels

**Files:**
- Modify: `src/components/UploadAnalysisPanel.tsx`
- Modify: `src/components/DataAssistant.tsx`
- Modify: `src/components/ReportBuilder.tsx`
- Modify: `src/components/ExportsHub.tsx`
- Modify: `src/lib/storyBuilder.ts`

**Interfaces:**
- Consumes: Existing React props and analysis data.
- Produces: clearer user-facing text without changing data contracts.

- [ ] **Step 1: Replace stiff labels with business-friendly labels**

Examples:

```tsx
// before: "Focused analysis"
// after: "What this analysis shows"

// before: "Downloadable spreadsheet views"
// after: "Ready-to-use filtered sheets"

// before: "Shape the story"
// after: "Choose how the presentation should speak"
```

- [ ] **Step 2: Clarify missing-data copy**

Ensure visible copy says missing values are ignored for rankings and segment drivers so users understand why blanks do not appear.

- [ ] **Step 3: Keep report downloads limited to PDF and PPT**

Verify `ReportBuilder.tsx` shows only `Download PDF` and `Download PPT` in the presentation header.

- [ ] **Step 4: Run typecheck**

Run: `npm.cmd run typecheck`
Expected: exit code 0.

---

### Task 4: Remove Dead Report Export Surface

**Files:**
- Modify: `src/lib/storyBuilder.ts`
- Modify: `src/components/ReportBuilder.tsx`

**Interfaces:**
- Keeps: `downloadPresentationPdf(deck: PresentationDeck)` and `downloadPresentationPpt(deck: PresentationDeck)`.
- Removes or leaves unreferenced only if still needed elsewhere: `downloadStoryConfig` and `downloadPresentationOutline` should not be imported by Reports UI.

- [ ] **Step 1: Confirm no Reports UI imports removed exporters**

Run: `rg "downloadStoryConfig|downloadPresentationOutline|downloadPresentationHtml|Export config|Export outline|Export HTML" src\components\ReportBuilder.tsx src\lib\storyBuilder.ts -n`
Expected: no matches for UI imports or labels.

- [ ] **Step 2: Keep or remove library exports based on usage**

If no other source imports `downloadStoryConfig` or `downloadPresentationOutline`, remove those functions from `storyBuilder.ts`. If another source imports them, leave the library functions but keep them off Reports page.

- [ ] **Step 3: Run build**

Run: `npm.cmd run build`
Expected: exit code 0. Existing large chunk warning is acceptable if build succeeds.

---

### Task 5: Final Verification and Push

**Files:**
- Stage only files intentionally modified by this cleanup.
- Do not stage `backend/corsPolicy.ts` unless the user explicitly approves it.

**Interfaces:**
- Produces: one cleanup commit on `main` pushed to `origin/main`.

- [ ] **Step 1: Run full verification**

Run:

```powershell
npx.cmd tsx backend\uploadAnalysisService.test.ts
npx.cmd tsx backend\advancedAnalysisService.test.ts
npm.cmd run typecheck
npm.cmd run build
```

Expected: all commands exit 0; Vite chunk-size warning may appear but build must complete.

- [ ] **Step 2: Restore generated learning data if tests changed it**

Run: `git restore data\learning-store.json` if `git status --short` shows that file modified.

- [ ] **Step 3: Review diff**

Run: `git diff --stat` and `git diff -- <changed files>`.
Expected: cleanup files only, plus pre-existing unstaged `backend/corsPolicy.ts` not staged.

- [ ] **Step 4: Commit and push**

Run:

```powershell
git add shared\valueGuards.ts backend\uploadAnalysisService.ts backend\advancedAnalysisService.ts backend\advancedAnalysisService.test.ts backend\uploadAnalysisService.test.ts src\components\UploadAnalysisPanel.tsx src\components\DataAssistant.tsx src\components\ReportBuilder.tsx src\components\ExportsHub.tsx src\lib\storyBuilder.ts docs\superpowers\specs\2026-07-25-bizdata-code-humanization-cleanup-design.md docs\superpowers\plans\2026-07-25-bizdata-code-humanization-cleanup.md
git commit -m "Clean and humanize analytics code"
git push origin main
git ls-remote origin refs/heads/main
```

Expected: remote hash matches the new commit.

## Self-Review

Spec coverage: covered shared blank handling, backend analysis cleanup, frontend copy, report downloads, verification, and push requirements.

Placeholder scan: no TBD/TODO/fill-in placeholders are present.

Type consistency: shared helper names are defined in Task 1 and consumed consistently in later tasks.