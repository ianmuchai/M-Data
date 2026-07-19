# Visual Story Builder Design

## Purpose

M-Data clients should be able to turn analyses and datasets into visualizations and presentation-ready stories, not only inspect dashboards or download raw outputs. This feature upgrades the Reports section into a Visual Story Builder that produces chart panels, narrative insight cards, slide-like pages, and downloadable presentation artifacts from built-in dashboard data and uploaded dataset analysis.

## Scope

Included:

- A richer report/presentation builder inside the existing Reports section.
- Visualization options for bar, line, area, scorecards, table, comparison, ranking, and insight cards.
- Presentation presets for executive, analyst, operations, and board-style stories.
- Slide-like pages generated from available dashboard/upload/analysis data.
- Live preview of the selected visualization and presentation deck.
- Export of visualization/report config JSON.
- Export of presentation outline JSON.
- Export of presentation as standalone HTML.

Preserved:

- Existing dashboard analytics and exports.
- Upload analysis flow and all supported file types.
- Advanced analytics results.
- Downloads Hub behavior.
- Tenant branding and PWA behavior.

Out of scope for this pass:

- True drag-and-drop canvas editing.
- Persistent saved reports.
- PPTX/PDF generation.
- Collaborative editing.
- External data connectors.

## User Experience

Reports should become a workspace where users can choose a story type, choose a data source, select a visual style, and immediately see both a visualization preview and a presentation preview.

The UI should make it obvious that M-Data can create:

- A single visual panel for analysis or reporting.
- A multi-slide presentation story.
- Downloadable artifacts that can be shared or archived.

## Visualizations

Visualization panels should be generated from available data:

- Dashboard source: trend, metrics, insights, alerts, and breakdown rows.
- Upload source: upload metrics, columns, analysis results, recommendations, and filtered view inventory.

Supported visual types:

- Bar
- Line
- Area
- Scorecards
- Table
- Comparison
- Ranking
- Insight cards

The first implementation can render custom lightweight visual previews rather than introducing chart dependencies. Existing Recharts usage remains available for the main dashboard.

## Presentations

Presentation slides should be structured objects with:

- id
- title
- subtitle
- section label
- narrative body
- metrics
- bullets
- visual points
- recommendations

Generated slide presets:

- Executive Summary
- Dataset Readiness
- Key Metrics
- Trends and Forecasts
- Segments and Rankings
- Risks and Anomalies
- Recommendations

The builder should support preset selection:

- Executive: concise business story.
- Analyst: more method/result detail.
- Operations: actions, exceptions, and next steps.
- Board: high-level performance and recommendations.

## Exports

Exports should include:

- Story config JSON.
- Presentation outline JSON.
- Standalone HTML presentation.

The HTML export should be self-contained and styled inline enough to be useful when opened in a browser. It does not need offline images or PPTX/PDF generation in this pass.

## Architecture

Shared types should describe story config, visualization preview, presentation slides, and presentation decks.

Frontend helper module:

- Converts dashboard/upload data into visualization preview data.
- Converts dashboard/upload data into presentation slides.
- Downloads JSON and HTML artifacts.

React component:

- Upgrade `ReportBuilder.tsx` into the visual story builder UI.
- Keep the component focused by using helper functions for data transformation and export.

## Error Handling

- If dashboard data is missing, show an explanatory empty state.
- If upload data is missing, disable upload-only options with visible guidance.
- If a selected visual type lacks suitable data, show an insight-card fallback.
- Export buttons should be disabled only when no deck/config can be generated.

## Verification

- Typecheck.
- Existing backend tests for analytics and CORS.
- Production build.
- Smoke check frontend and backend health endpoints.
- Confirm Reports renders without upload data.
- Confirm Reports uses upload data after upload state is available.
- Confirm JSON and HTML export controls are present.
