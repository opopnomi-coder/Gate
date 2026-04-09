import { Platform } from 'react-native';
import { generatePDF } from 'react-native-html-to-pdf';
import RNFS from 'react-native-fs';

type ReportColumn = { key: string; label: string };
type ReportRow = Record<string, any>;

const escapeHtml = (value: any): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export async function exportStyledPdfReport(params: {
  title: string;
  subtitle?: string;
  /** Section label above the table (e.g. "Exit records") */
  sectionHeading?: string;
  /** First footer line — system branding */
  brandFooterLine?: string;
  generatedAt?: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  filename?: string;
}) {
  const { title, subtitle, columns, rows } = params;
  const sectionHeading = params.sectionHeading ?? 'Report Details';
  const brandFooterLine = params.brandFooterLine ?? 'RIT Gate Management System';
  const timeStamp = params.generatedAt || new Date().toLocaleString();

  const headerCols = columns
    .map((c) => `<th>${escapeHtml(String(c.label).toUpperCase())}</th>`)
    .join('');
  const bodyRows = rows
    .map((row) => {
      const tds = columns.map((c) => {
        const isName = c.key === 'name' || c.label.toLowerCase() === 'name';
        return `<td${isName ? ' class="name-col"' : ''}>${escapeHtml(row[c.key])}</td>`;
      }).join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, Helvetica, sans-serif; padding: 28px 32px; color: #333; background: #fff; }

          /* ── Header ── */
          .header { display: flex; align-items: center; margin-bottom: 14px; }
          .header-text { flex: 1; }
          .header-title { font-size: 24px; font-weight: 700; color: #667eea; margin-bottom: 3px; }
          .header-date { font-size: 11px; color: #666; }
          .header-divider { border: none; border-top: 2px solid #667eea; margin-bottom: 24px; }

          /* ── Section label ── */
          .section { font-size: 11px; font-weight: 700; color: #667eea; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }

          /* ── Table ── */
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th {
            background: #667eea;
            color: #fff;
            padding: 9px 8px;
            text-align: left;
            border: 1px solid #ddd;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-size: 9px;
            font-weight: 700;
          }
          td { padding: 8px; border: 1px solid #ddd; vertical-align: top; color: #333; font-size: 11px; }
          tr:nth-child(even) td { background: #f9f9f9; }
          tr:nth-child(odd) td { background: #fff; }
          td.name-col { font-weight: 700; }

          /* ── Footer ── */
          .footer-line { border: none; border-top: 1px solid #ddd; margin-top: 28px; margin-bottom: 12px; }
          .footer { text-align: center; font-size: 11px; color: #666; line-height: 1.8; }
          .footer-brand { font-weight: 700; color: #667eea; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-text">
            <div class="header-title">${escapeHtml(title)}</div>
            <div class="header-date">Generated on ${escapeHtml(timeStamp)}${subtitle ? ' &nbsp;·&nbsp; ' + escapeHtml(subtitle) : ''}</div>
          </div>
        </div>
        <hr class="header-divider" />
        <div class="section">${escapeHtml(sectionHeading)}</div>
        <table>
          <thead>
            <tr>${headerCols}</tr>
          </thead>
          <tbody>
            ${bodyRows || `<tr><td colspan="${columns.length}" style="text-align:center;padding:20px;color:#666;">No records available</td></tr>`}
          </tbody>
        </table>
        <hr class="footer-line" />
        <div class="footer">
          <div class="footer-brand">${escapeHtml(brandFooterLine)}</div>
          <div>This report contains confidential information. Handle with care.</div>
          <div>Total Records: ${rows.length} &nbsp;|&nbsp; Report Generated: ${escapeHtml(timeStamp)}</div>
        </div>
      </body>
    </html>
  `;

  if (Platform.OS === 'web') {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
    return;
  }

  const safeTitle = (params.filename || title || 'report').replace(/[^a-z0-9-_]/gi, '_');
  const stampedName = `${safeTitle}_${new Date().toISOString().slice(0, 10)}.pdf`;
  const pdf = await generatePDF({
    html,
    fileName: stampedName.replace(/\.pdf$/i, ''),
    directory: 'Documents',
  });

  if (!pdf.filePath) return '';

  // Copy to public Downloads directory so the file appears in the device's Downloads app
  if (Platform.OS === 'android') {
    try {
      const downloadsDir = RNFS.DownloadDirectoryPath;
      const destPath = `${downloadsDir}/${stampedName}`;
      await RNFS.copyFile(pdf.filePath, destPath);
      // Trigger media scan so file appears immediately in Downloads app
      await RNFS.scanFile(destPath);
      return destPath;
    } catch (copyError) {
      // Fallback to internal path if copy fails
      console.warn('Failed to copy PDF to Downloads:', copyError);
      return `file://${pdf.filePath}`;
    }
  }

  return `file://${pdf.filePath}`;
}
