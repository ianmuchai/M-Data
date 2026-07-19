# Guided UI Rebuild Design

## Purpose

M-Data needs a friendlier, more professional frontend that feels welcoming to non-technical users while still being powerful enough for analysts. The redesign should preserve the working analytics foundation, upload intelligence, dashboard metrics, PWA behavior, tenant branding, and export flows, but reorganize the interface into a clearer guided workspace.

The new UI should reduce intimidation by explaining what the user can do next, making upload and export actions obvious, and presenting advanced analytics as approachable guided choices rather than dense technical panels.

## Scope

Included:

- A fuller UI rebuild across the main workspace sections.
- A calmer visual system with professional spacing, restrained surfaces, friendlier copy, and clearer hierarchy.
- A redesigned app shell with welcoming header, section navigation, and persistent workflow context.
- A guided home experience that shows next actions, readiness, and recent dataset state.
- A more reassuring Data page with supported file types, upload expectations, dataset readiness, and stronger download actions.
- Improved Analyze, Reports, and Exports pages that make complex features easier to understand.
- A centralized export experience for dashboard CSV/JSON, filtered Excel views, analyzed summary JSON, report config JSON, and an analysis workbook export where practical.
- Responsive desktop and mobile layouts with stable dimensions and no overlapping content.

Preserved:

- Supported uploads: CSV, TSV, TXT, JSON, XLS, XLSX, XLSM, and XLSB.
- Existing backend analysis APIs and upload parsing behavior.
- Existing filtered Excel export behavior.
- Existing advanced analytics results and method compatibility.
- Existing dashboard export behavior.
- Existing PWA install messaging and tenant branding.

Out of scope for this pass:

- Persistent saved dashboards.
- External data connectors.
- Multi-user collaboration.
- Drag-and-drop dashboard canvas editing.
- Authentication or permissions.

## Product Direction

The UI should feel like a guided analytics assistant and BI workbench combined. It should not look like a marketing landing page, and it should not bury users in technical controls on first load.

The first screen should answer three questions quickly:

1. What is happening in my business right now?
2. What data can I add or inspect?
3. What can I download, analyze, or report next?

## Layout

### App Shell

Use a full workspace layout with:

- A compact branded topbar.
- A friendly welcome strip or status header.
- A clear section navigation for Overview, Data, Analyze, Reports, and Exports.
- A constrained content area that avoids giant stacked panels.
- Responsive sections that collapse into single-column mobile layouts.

### Overview

Overview should become a friendly command center with:

- A welcome panel using the configured app and company names.
- A concise status summary for dashboard health and latest uploaded dataset.
- Four primary next-action tiles: Upload data, Analyze dataset, Build report, Download results.
- Current KPI cards, trend overview, signals, deep-dive points, and breakdown table arranged below the command area.

### Data

Data should make uploading feel safe and simple:

- A prominent upload zone with supported file types shown clearly.
- Plain-language explanation of what M-Data will do: profile columns, detect business meaning, suggest analyses, create filtered exports, and prepare downloads.
- Dataset summary cards after upload.
- Clear buttons for downloading filtered Excel views.
- A new analyzed summary JSON download for the uploaded analysis response.
- Existing business lenses, market signals, role insights, recommendations, and column profiles retained but visually simplified.

### Analyze

Analyze should make statistical methods approachable:

- Method cards grouped into simple categories: Explain, Predict, Detect, Compare, Plan.
- Enabled methods should be visually clear; disabled methods should explain what field is missing.
- Results should use readable metric cards, short explanations, compact charts, and compact tables.
- Recommendations and warnings should be separated so risk/confidence notes are not lost.

### Reports

Reports should feel like a lightweight report builder:

- Left-side controls on desktop, stacked controls on mobile.
- Data source, chart type, metric, dimension, and layout preset controls.
- Preview area that looks like a report page, not a form.
- Friendly empty states when uploaded data is not available.
- Export report config action.

### Exports

Exports should be an obvious output center:

- Dashboard CSV and JSON export cards.
- Upload analyzed summary JSON export.
- Analysis workbook export with separate sheets for metrics, columns, method compatibility, analysis results, filtered view inventory, and recommendations.
- Filtered Excel view inventory with clear directions to preview/download each view.
- Disabled actions should explain what is needed.

## Components

Create or substantially update focused components:

- `WorkspaceHero`: friendly status/welcome header and quick actions.
- `WorkflowCards`: next-action tiles reused on Overview.
- `DatasetReadiness`: latest upload quality, row count, supported files, and analysis readiness.
- `FriendlyUploadPanel`: either refactor the existing upload panel or enhance it in place with clearer sections and export buttons.
- `AnalysisStudio`: improve grouping, method readability, result hierarchy, and empty states.
- `ReportBuilder`: improve preview framing and controls.
- `ExportsHub`: add analyzed summary JSON and workbook-style export where practical.
- `WorkbenchNav`: refine labels, active states, and mobile ergonomics.

Do not split components just for novelty. Split where the current surface is too dense or where reuse improves clarity.

## Data And Export Behavior

The upload API already accepts the required file types. The frontend should make support explicit and keep the `accept` list aligned with backend parsing.

Exports should include:

- Dashboard CSV: existing behavior.
- Dashboard JSON: existing behavior.
- Filtered Excel views: existing behavior.
- Upload analysis JSON: new frontend download of the latest `UploadAnalysisResponse`.
- Report config JSON: existing report config export, visually improved.
- Analysis workbook: new frontend Excel workbook generated from the latest upload analysis. It should include compact, useful sheets and avoid dumping huge raw datasets.

The workbook does not need to include every raw uploaded row in this pass because the backend intentionally caps and summarizes upload analysis in memory. Filtered views already provide row-level Excel downloads for targeted subsets.

## Visual System

Use a calmer professional palette:

- Neutral page background.
- White or near-white content surfaces.
- Teal and blue accents for primary actions and active states.
- Amber only for warnings or guided attention.
- Red only for critical/errors.

Avoid visual intimidation:

- Reduce heavy gradients and shadows.
- Use concise headings and friendly body copy.
- Make action buttons obvious but not loud.
- Keep cards at 8px radius or less.
- Ensure text fits in controls on mobile and desktop.

## Accessibility And Responsiveness

- Use native buttons, inputs, select controls, and semantic sections.
- Keep keyboard-accessible upload and navigation interactions.
- Maintain visible focus states.
- Avoid hover-only access to important information.
- Tooltips may remain for extra context, but core instructions must be visible.
- Verify desktop and mobile layouts for overlap and readable text.

## Error Handling

- Upload errors should stay friendly and actionable.
- Unsupported or malformed files should explain the required structure.
- Export buttons should be disabled when data does not exist and should display clear supporting text.
- Analysis pages should explain missing requirements rather than showing blank panels.

## Testing And Verification

Verification should include:

- Typecheck.
- Production build.
- Advanced analytics focused tests.
- Manual browser smoke check for frontend and backend health.
- Confirm supported upload copy matches accepted file types.
- Confirm dashboard CSV/JSON exports still work.
- Confirm filtered Excel exports still work.
- Confirm upload analysis JSON export and analysis workbook export are available after an upload.
- Check responsive desktop and mobile layouts for text overflow, overlap, and navigation usability.
