/** Small browser download helpers used by export / template / document buttons. */

export function downloadText(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  downloadBlob(filename, blob);
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadDataUrl(filename: string, dataUrl: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Rows of plain objects -> CSV (columns from the first row unless given). */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  const cols = columns ?? Object.keys(rows[0] ?? {});
  return [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n');
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[], columns?: string[]): void {
  downloadText(filename, toCsv(rows, columns), 'text/csv');
}

/** Reads a picked file as a data URL (for small attachments stored with a record). */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Opens a native file picker and resolves with the chosen file (or null). */
export function pickFile(accept = '*/*'): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

export const MAX_ATTACHMENT_BYTES = 1_500_000;

function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export interface PrintSection {
  heading?: string;
  /** Label/value pairs shown as a two-column list. */
  fields?: [string, unknown][];
  /** A table: header row + body rows. */
  table?: { columns: string[]; rows: unknown[][] };
  text?: string;
}

/**
 * Opens a clean printable document in a new window and starts printing, so
 * the user can "Save as PDF" from the browser's print dialog.
 */
export function printDocument(title: string, sections: PrintSection[], subtitle = 'SeedSphere · QMICS'): void {
  const body = sections.map((s) => {
    const parts: string[] = [];
    if (s.heading) parts.push(`<h2>${esc(s.heading)}</h2>`);
    if (s.fields?.length) parts.push(`<dl>${s.fields.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`);
    if (s.table) parts.push(`<table><thead><tr>${s.table.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${s.table.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    if (s.text) parts.push(`<p>${esc(s.text)}</p>`);
    return `<section>${parts.join('')}</section>`;
  }).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2a24;margin:32px;font-size:13px}
    header{border-bottom:2px solid #1f6f43;padding-bottom:10px;margin-bottom:18px}
    h1{margin:0;font-size:22px}header p{margin:4px 0 0;color:#5b6b62}
    h2{font-size:14px;margin:18px 0 8px;text-transform:uppercase;letter-spacing:.04em;color:#1f6f43}
    dl{display:grid;grid-template-columns:180px 1fr;gap:4px 12px;margin:0}dt{color:#5b6b62}dd{margin:0;font-weight:600}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #d8ded9;padding:6px 8px;text-align:left}th{background:#f2f5f3}
    footer{margin-top:28px;color:#8a978f;font-size:11px}
  </style></head><body><header><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></header>${body}
  <footer>Generated ${esc(new Date().toLocaleString('en-IN'))}</footer></body></html>`;
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) {
    downloadText(`${title.replace(/[^\w.-]+/g, '_')}.html`, html, 'text/html');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
