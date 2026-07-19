# Vibrant Professional UI Design

## Purpose

M-Data should feel more energetic and rewarding to work in while staying professional and trustworthy. The current guided workspace is clear but too plain. This design adds visual energy from actual dashboard and upload data: score, readiness, method availability, export counts, metric sentiment, and dataset shape.

## Scope

Included:

- More vibrant but controlled visual system.
- Data-driven hero with KPI chips, mini bars, and readiness accents.
- Stronger workflow cards using status-based color and visual rhythm.
- More engaging Data, Analyze, Reports, and Downloads sections.
- Professional color accents that communicate meaning rather than decoration.
- Responsive polish for mobile and desktop.

Preserved:

- Current upload support for CSV, TSV, TXT, JSON, XLS, XLSX, XLSM, and XLSB.
- Current upload parsing and backend analysis behavior.
- Dashboard CSV/JSON export.
- Upload analysis JSON export.
- Analysis workbook export.
- Filtered Excel exports.
- Advanced analysis methods and report builder behavior.
- Tenant branding and PWA install flow.

## Visual Direction

The UI should feel like a polished analytics command center: lively, clear, and confident. Use teal and blue as the main brand colors, with green, amber, coral, and rose reserved for data meaning. Avoid a flat white/gray-only interface, but keep gradients subtle and purposeful.

## Data-Driven Visuals

Use actual values where possible:

- Dashboard score drives hero status and KPI emphasis.
- Upload quality score drives readiness styling.
- Ready analysis method count drives method readiness display.
- Filtered export count drives download value display.
- Metric sentiment drives card accent color.
- Trend values drive compact visual bars.

## Component Changes

- `WorkspaceHero`: add a data pulse panel with score, ready method count, export count, and mini trend bars.
- `CommandOverview`: make workflow cards visually distinct with data-backed accents.
- `DatasetReadiness`: add quality-level classes and stronger readiness presentation.
- `AnalysisStudio`: add method group accent colors and result panel visual hierarchy.
- `ReportBuilder`: make report preview feel more like an artifact users want to export.
- `ExportsHub`: make download cards more valuable and visually actionable.
- `styles.css`: add the vibrant visual layer while preserving existing responsive rules.

## Constraints

- Do not add new dependencies.
- Do not remove existing functionality.
- Do not make the interface visually chaotic.
- Keep cards at 8px border radius or less.
- Avoid text overlap on mobile and desktop.
- Keep all important instructions visible, not tooltip-only.

## Verification

- Run typecheck.
- Run backend analytics and CORS tests.
- Run production build.
- Smoke check frontend and backend health endpoints.
- Confirm upload/export UI still displays supported files and download actions.
