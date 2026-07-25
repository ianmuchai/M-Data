# BizDATA Code Humanization Cleanup Design

## Goal
Clean and humanize the BizDATA codebase without rewriting the product or breaking existing analytics workflows. The cleanup should make the app easier to maintain, make user-facing language clearer, and remove repeated sources of confusion such as blank values being treated as real business segments.

## Scope
This cleanup focuses on the current BizDATA web app and backend analytics services:

- Backend upload analysis behavior in `backend/uploadAnalysisService.ts` and `backend/advancedAnalysisService.ts`.
- Frontend analysis and report UI in `src/components/UploadAnalysisPanel.tsx`, `src/components/ReportBuilder.tsx`, and `src/components/DataAssistant.tsx`.
- Presentation and export helpers in `src/lib/storyBuilder.ts` and related lightweight utilities.
- Shared types only where clearer interfaces are needed.

The existing unrelated `backend/corsPolicy.ts` worktree change is out of scope unless explicitly approved.

## Design Principles
- Preserve working behavior and current feature breadth.
- Prefer small helper extraction over broad rewrites.
- Use plain business language for user-facing copy.
- Treat blank, null-like, N/A, and placeholder values as missing data, not measurable segments or ranking labels.
- Keep report downloads on the Reports page limited to PDF and PPT presentation exports.
- Keep spreadsheet downloads elsewhere intact.
- Avoid adding dependencies unless a feature cannot be maintained safely without one.
- Verify with TypeScript, production build, and focused backend tests before committing.

## Architecture
The cleanup will introduce or strengthen small, shared helpers for value normalization, label formatting, and download wording. Large modules will remain in place unless extracting a helper reduces real duplication with low risk. Frontend copy will be made clearer in the components where users see it, while backend logic will enforce data quality rules at the source.

## User-Facing Language
BizDATA should speak like a business analyst sitting beside the user. Labels should explain what a number or segment means, what decision it informs, and when missing data has been ignored. Copy should avoid generic technical words when clearer business wording is available.

## Reliability Requirements
- No visible blank/N/A/null segment drivers or ranking leaders.
- No dead Reports page presentation download options beyond PDF and PPT.
- Existing upload, analyze, report, chatbot, and export flows must still compile and build.
- Tests must cover blank handling in upload and advanced analytics paths.

## Acceptance Criteria
- `npm.cmd run typecheck` passes.
- `npm.cmd run build` passes.
- `npx.cmd tsx backend\uploadAnalysisService.test.ts` passes.
- `npx.cmd tsx backend\advancedAnalysisService.test.ts` passes after adding/adjusting blank handling coverage.
- Git status shows only intentional cleanup files plus the pre-existing unstaged `backend/corsPolicy.ts` change.
- Cleanup is committed and pushed to `origin/main` after verification.