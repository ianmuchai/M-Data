export type PrintableTable = {
  title: string;
  description?: string;
  columns: string[];
  rows: Array<Array<string | number>>;
};

export type PrintableSection = {
  title: string;
  body?: string;
  bullets?: string[];
  cards?: Array<{ label: string; value: string; detail?: string }>;
  tables?: PrintableTable[];
};

type PrintableReport = {
  fileName: string;
  title: string;
  subtitle?: string;
  generatedAt?: string;
  sections: PrintableSection[];
};

function escapeHtml(value: string | number | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeFilePart(value: string) {
  return value.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'bizdata-report';
}

function tableHtml(table: PrintableTable) {
  const header = table.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
  const rows = table.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('');

  return `
    <section class="table-block">
      <h3>${escapeHtml(table.title)}</h3>
      ${table.description ? `<p>${escapeHtml(table.description)}</p>` : ''}
      <table><thead><tr>${header}</tr></thead><tbody>${rows || `<tr><td colspan="${table.columns.length}">No rows available.</td></tr>`}</tbody></table>
    </section>`;
}

function sectionHtml(section: PrintableSection) {
  const cards = section.cards?.length
    ? `<div class="cards">${section.cards
        .map((card) => `<article><span>${escapeHtml(card.label)}</span><strong>${escapeHtml(card.value)}</strong>${card.detail ? `<small>${escapeHtml(card.detail)}</small>` : ''}</article>`)
        .join('')}</div>`
    : '';
  const bullets = section.bullets?.length ? `<ul>${section.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>` : '';
  const tables = section.tables?.map(tableHtml).join('') ?? '';

  return `
    <section class="report-section">
      <h2>${escapeHtml(section.title)}</h2>
      ${section.body ? `<p>${escapeHtml(section.body)}</p>` : ''}
      ${cards}
      ${bullets}
      ${tables}
    </section>`;
}

export function openPrintablePdfReport(report: PrintableReport) {
  const title = escapeHtml(report.title);
  const fileName = `${safeFilePart(report.fileName)}.pdf`;
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page { margin: 16mm; size: A4; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f4f7fb; color: #102033; font-family: Inter, "Segoe UI", Arial, sans-serif; }
    .toolbar { position: sticky; top: 0; z-index: 2; display: flex; justify-content: space-between; gap: 12px; padding: 12px 18px; background: #0f766e; color: #fff; }
    .toolbar button { border: 0; border-radius: 6px; padding: 10px 14px; background: #fff; color: #0f766e; font-weight: 800; cursor: pointer; }
    main { max-width: 1040px; margin: 0 auto; padding: 24px; }
    .cover, .report-section { margin-bottom: 18px; border: 1px solid #dbe7ef; border-radius: 8px; padding: 22px; background: #fff; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
    .cover { background: linear-gradient(135deg, #ffffff, #ecfeff 58%, #eef2ff); }
    .eyebrow { margin: 0 0 6px; color: #0f766e; font-size: 11px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 0; font-size: 34px; line-height: 1.12; }
    h2 { margin: 0 0 8px; font-size: 21px; }
    h3 { margin: 18px 0 8px; font-size: 15px; color: #0f3f46; }
    p, li, small { color: #506070; line-height: 1.5; }
    .cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 14px; }
    .cards article { border: 1px solid #d7ece8; border-radius: 8px; padding: 12px; background: #f8fffd; }
    .cards span { display: block; color: #607081; font-size: 11px; font-weight: 900; text-transform: uppercase; }
    .cards strong { display: block; margin-top: 6px; color: #102033; font-size: 20px; }
    .cards small { display: block; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th, td { border-bottom: 1px solid #e5edf3; padding: 8px; text-align: left; vertical-align: top; }
    th { color: #425466; background: #f1f7f8; font-size: 10px; text-transform: uppercase; }
    tr:nth-child(even) td { background: #fbfdff; }
    .table-block { break-inside: avoid; }
    @media print {
      body { background: #fff; }
      .toolbar { display: none; }
      main { max-width: none; padding: 0; }
      .cover, .report-section { box-shadow: none; break-inside: avoid; }
    }
    @media (max-width: 760px) { .cards { grid-template-columns: 1fr 1fr; } main { padding: 12px; } }
  </style>
</head>
<body>
  <div class="toolbar"><strong>BizDATA PDF preview</strong><button onclick="window.print()">Save as PDF</button></div>
  <main>
    <section class="cover">
      <p class="eyebrow">BizDATA analytics report</p>
      <h1>${title}</h1>
      ${report.subtitle ? `<p>${escapeHtml(report.subtitle)}</p>` : ''}
      <p>Generated ${escapeHtml(report.generatedAt ?? new Date().toLocaleString())}. Choose <strong>Save as PDF</strong> in the print dialog to download a PDF copy.</p>
    </section>
    ${report.sections.map(sectionHtml).join('')}
  </main>
  <script>document.title = ${JSON.stringify(fileName)}; setTimeout(() => window.print(), 350);</script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeFilePart(report.fileName)}-pdf-preview.html`;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
