# Balanced Analytics Foundation Design

## Purpose

M-Data should evolve from a guided analytics dashboard into a comprehensive analytics workbench that covers both uploaded datasets and built-in dashboard data. The first buildable version will add a modern navigation shell, user-selectable analytical methods, and a lightweight report builder while retaining existing upload intelligence, filtered Excel exports, PWA behavior, tenant branding, and dashboard metrics.

The product goal is to give users a broader, more guided experience than traditional BI tools: M-Data should not only visualize data, but also explain which analyses are possible, suggest useful parameters, and produce practical recommendations.

## Scope

This design covers a balanced foundation, not a full PowerBI clone. It should provide complete, polished workflows for the first set of features while leaving deeper drag-and-drop canvas editing, persistent multi-user report storage, connectors, semantic models, row-level permissions, and scheduled refresh for later phases.

Included:

- Modern app shell with clear sections: Overview, Data, Analyze, Reports, and Exports.
- A shared analytics model that can describe supported methods, field requirements, results, warnings, and recommendations.
- User-selectable methods for regression, correlation, forecasting, anomaly detection, segmentation, distribution, trend, ranking, and what-if scenarios.
- Compatibility checks that only enable methods when suitable fields exist.
- Lightweight report builder controls for chart type, metric, dimension, filter, and layout preset.
- Frontend presentation for analysis results, report previews, export paths, and dataset health.
- Optimized computation boundaries for large uploads.

Preserved:

- Existing dashboard API and visual panels.
- Existing upload parsing for CSV, TSV, TXT, JSON, XLS, XLSX, XLSM, and XLSB.
- Column profiling, role insights, market signals, learning summary, analysis options, filter views, Excel downloads, recommendations, PWA install flow, and tenant branding.

## Architecture

The implementation should separate data understanding, statistical analysis, and presentation.

Backend modules:

- `uploadAnalysisService.ts` remains responsible for parsing files, profiling columns, role inference, market signals, suggested business lenses, filter views, and upload response assembly.
- A new analysis module should own analytical calculations. It should receive rows plus column profiles and return method-specific results.
- Shared types in `shared/analytics.ts` should define analysis method metadata, user-selectable parameters, result sections, chart-ready series, warnings, and report builder configuration.

Frontend modules:

- `App.tsx` should become a section-based shell instead of a long single-page stack.
- Existing components should be reused where they still fit.
- New components should focus on distinct workbench areas: navigation shell, overview command center, data workbench, analysis studio, report builder, and exports hub.
- Heavy charts and large previews should render lazily or from compact result payloads.

## Data Flow

1. Built-in dashboard data continues to load through the current analytics API.
2. Uploaded files continue through the current upload API and produce `UploadAnalysisResponse`.
3. Upload analysis responses should include method compatibility and computed results where possible.
4. The frontend keeps the active dataset context: built-in dashboard data, latest upload, selected section, selected analysis method, selected analysis parameters, and selected report configuration.
5. Analysis Studio shows eligible methods first and disabled methods with short reasons.
6. Report Builder Lite can use either built-in dashboard data or the latest uploaded dataset where compatible fields exist.

## Analytical Methods

Regression:

- Requires one numeric target and at least one numeric predictor.
- First version should support simple linear regression for a selected predictor and target.
- Return slope, intercept, R-squared, sample size, predicted points, residual summary, and plain-language interpretation.

Correlation:

- Requires at least two numeric fields.
- Return ranked numeric field pairs with Pearson correlation, strength label, and recommended follow-up.

Forecasting:

- Requires a date field and a numeric metric.
- First version should use a transparent moving-average or linear trend projection.
- Return historical series, forecast series, trend direction, confidence notes, and data sufficiency warnings.

Anomaly Detection:

- Requires a numeric field.
- First version should use z-score or IQR thresholds.
- Return anomaly rows or compact anomaly records, threshold details, severity, and recommendations.

Segmentation:

- Requires one categorical field and one numeric metric.
- Return segment totals, averages, counts, share, and ranking.

Distribution:

- Requires a numeric field.
- Return min, max, average, median, quartiles, buckets, outlier count, and skew notes.

Trend:

- Requires a date field and numeric metric.
- Return period aggregation, period-over-period movement, best/worst period, and chart-ready series.

Ranking:

- Requires one segment/identifier field and one numeric metric.
- Return top and bottom records or groups with contribution share.

What-if Scenario:

- Requires one numeric metric.
- Let the user apply percentage uplift or reduction.
- Return baseline, adjusted value, delta, and recommendation.

## User Experience

The app should feel like a modern analytics product built for repeated use. The first screen should be the product workspace, not a marketing page.

Navigation:

- A left or top section navigation should expose Overview, Data, Analyze, Reports, and Exports.
- The active section must be obvious.
- Mobile should collapse gracefully without hiding important actions.

Overview:

- Show current dashboard KPIs.
- Show latest uploaded dataset summary when available.
- Show recommended next actions based on available data.
- Provide quick buttons to upload, analyze, build report, and export.

Data:

- Preserve upload workflow.
- Present column quality, role insights, market signals, detected business lenses, and suggested filtered exports.
- Keep existing Excel export flow.

Analyze:

- Present method cards with compatibility status.
- Let users choose method-specific parameters.
- Show compact results, chart-ready visual summaries, warnings, and recommendations.
- Make empty states useful: explain what data is needed for each method.

Reports:

- Provide chart type, metric, dimension, filter, and layout preset controls.
- Show a report preview using available built-in or uploaded data.
- Include report-ready insight cards and export actions.

Exports:

- Centralize CSV, JSON, and Excel exports.
- Surface filtered upload exports and report configuration export.

## Optimization Requirements

- Keep upload processing capped to safe row limits unless later persistence is added.
- Reuse parsed rows and profiles during a single analysis request instead of recomputing field compatibility repeatedly.
- Keep result payloads concise; do not send full row sets unless required for filtered exports.
- Memoize derived frontend state where it depends on uploaded analysis, selected method, or report configuration.
- Lazy-load chart-heavy components.
- Use stable responsive grid dimensions so cards, buttons, charts, and tables do not jump while loading.
- Keep disabled and loading states explicit.
- Avoid introducing new dependencies unless they materially reduce complexity or improve correctness.

## Error Handling

- If parsing fails, preserve the current friendly upload error behavior.
- If a method lacks required fields, show the missing requirements and suggest compatible alternatives.
- If calculations encounter insufficient data, return warnings rather than crashing.
- If a chart cannot render because of empty series, show a useful state panel.
- Export actions should be disabled when no compatible data exists.

## Testing And Verification

Verification should include:

- Typecheck.
- Production build.
- Deterministic checks for regression, correlation, anomaly detection, distribution, segmentation, ranking, trend, forecast, and what-if calculations.
- Manual browser verification for desktop and mobile widths after frontend changes.
- Regression check that existing upload parsing, analysis options, filtered Excel export, dashboard controls, and PWA install messaging still render.

## Open Decisions

For this first version, report configurations and uploaded datasets can remain in frontend memory. Persistence, collaborative editing, external data connectors, and scheduled refresh should be addressed in a later design once the core workbench interaction is stable.
