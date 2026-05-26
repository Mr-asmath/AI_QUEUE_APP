const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const normalizeRows = (columns, rows) => rows.map((row) => columns.map((column) => {
  const value = typeof column.value === 'function' ? column.value(row) : row[column.value || column.key];
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return value ?? '';
}));

const downloadBlob = (content, type, filename) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const exportToExcel = (filename, columns, rows) => {
  const bodyRows = normalizeRows(columns, rows);
  const table = `
    <table>
      <thead><tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr></thead>
      <tbody>${bodyRows.map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
  `;
  downloadBlob(table, 'application/vnd.ms-excel', `${filename}.xls`);
};

export const exportToPdf = (title, columns, rows) => {
  const bodyRows = normalizeRows(columns, rows);
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { font-size: 20px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #d1d5db; padding: 7px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <table>
          <thead><tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr></thead>
          <tbody>${bodyRows.map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
};

export function ExportMenu({ title, filename, columns, rows }) {
  const safeRows = rows || [];
  return (
    <details className="export-menu">
      <summary>Export</summary>
      <div>
        <button type="button" onClick={() => exportToExcel(filename, columns, safeRows)}>Excel</button>
        <button type="button" onClick={() => exportToPdf(title, columns, safeRows)}>PDF</button>
      </div>
    </details>
  );
}
