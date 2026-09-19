import PDFDocument from 'pdfkit';
import { ReportRecord } from './csv.exporter.js';

export function exportToPdfBuffer(records: ReportRecord[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 36, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    // Document Title
    doc.fontSize(18).font('Helvetica-Bold').text('Point-Flow Audit Report', { align: 'center' });
    doc.moveDown(0.5);

    // Summary Metadata
    const totalPoints = records.reduce((acc, r) => acc + Math.abs(r.pointAmount), 0);
    doc.fontSize(9).font('Helvetica').text(
      `Generated at: ${new Date().toISOString()} | Records Count: ${records.length} | Cumulative Points: ${totalPoints}`,
      { align: 'center' }
    );
    doc.moveDown(1);

    // Draw horizontal separator
    doc.moveTo(36, doc.y).lineTo(559, doc.y).strokeColor('#aaaaaa').stroke();
    doc.moveDown(0.5);

    // Table Header
    const startX = 36;
    let currentY = doc.y;

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000');
    doc.text('Timestamp', startX, currentY, { width: 90 });
    doc.text('Action Type', startX + 95, currentY, { width: 100 });
    doc.text('Actor', startX + 200, currentY, { width: 50 });
    doc.text('Points', startX + 255, currentY, { width: 45, align: 'right' });
    doc.text('Source -> Recipient', startX + 310, currentY, { width: 110 });
    doc.text('Details / Reason', startX + 425, currentY, { width: 130 });

    currentY += 16;
    doc.moveTo(startX, currentY).lineTo(559, currentY).strokeColor('#cccccc').stroke();
    currentY += 6;

    // Table Rows
    doc.font('Helvetica').fontSize(7);

    for (const r of records) {
      if (currentY > 750) {
        doc.addPage();
        currentY = 36;
      }

      const ts = new Date(r.eventTimestamp).toISOString().slice(0, 19).replace('T', ' ');
      const flow = `${r.sourceType ?? 'NONE'} -> ${r.recipientType ?? 'NONE'}`;
      const details = r.taskName
        ? `${r.taskName}${r.pointOption ? ` (${r.pointOption}pts)` : ''}`
        : r.reasonDescription ?? '';

      doc.fillColor('#333333');
      doc.text(ts, startX, currentY, { width: 90 });
      doc.text(r.actionType, startX + 95, currentY, { width: 100 });
      doc.text(r.actorRole, startX + 200, currentY, { width: 50 });
      doc.text(String(r.pointAmount), startX + 255, currentY, { width: 45, align: 'right' });
      doc.text(flow, startX + 310, currentY, { width: 110 });
      doc.text(details.slice(0, 45), startX + 425, currentY, { width: 130 });

      currentY += 14;
    }

    doc.end();
  });
}
