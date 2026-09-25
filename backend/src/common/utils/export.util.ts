import * as fastCsv from 'fast-csv';
import * as ExcelJS from 'exceljs';
import PdfPrinter = require('pdfmake');

export interface AuditLogExportRow {
  timestamp: string;
  actionType: string;
  actor: string;
  source: string;
  recipient: string;
  amount: number;
  reason: string;
  correlationId: string;
}

export class ExportUtil {
  static async generateCsv(rows: AuditLogExportRow[]): Promise<string> {
    const formatted = rows.map((r) => ({
      Timestamp: r.timestamp,
      'Action Type': r.actionType,
      Actor: r.actor,
      Source: r.source,
      Recipient: r.recipient,
      Amount: r.amount,
      'Reason / Task': r.reason,
      'Correlation ID': r.correlationId,
    }));

    return fastCsv.writeToString(formatted, { headers: true });
  }

  static async generateXlsx(rows: AuditLogExportRow[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Point Flow Audit');

    worksheet.columns = [
      { header: 'Timestamp', key: 'timestamp', width: 25 },
      { header: 'Action Type', key: 'actionType', width: 25 },
      { header: 'Actor', key: 'actor', width: 20 },
      { header: 'Source', key: 'source', width: 20 },
      { header: 'Recipient', key: 'recipient', width: 20 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Reason / Task', key: 'reason', width: 35 },
      { header: 'Correlation ID', key: 'correlationId', width: 38 },
    ];

    rows.forEach((row) => worksheet.addRow(row));

    // Style header
    worksheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  static async generatePdf(rows: AuditLogExportRow[]): Promise<Buffer> {
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };

    const printer = new (PdfPrinter as any)(fonts);

    const tableBody: any[][] = [
      ['Date', 'Action', 'Actor', 'Amount', 'Reason'],
      ...rows.map((r) => [
        r.timestamp.substring(0, 19).replace('T', ' '),
        r.actionType,
        r.actor,
        r.amount.toString(),
        r.reason.substring(0, 40),
      ]),
    ];

    const docDefinition: any = {
      defaultStyle: {
        font: 'Helvetica',
        fontSize: 8,
      },
      content: [
        {
          text: 'Student Reward System - Point Flow Report',
          fontSize: 14,
          bold: true,
          margin: [0, 0, 0, 10],
        },
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', 'auto', 'auto', '*'],
            body: tableBody,
          },
        },
      ],
    };

    return new Promise((resolve, reject) => {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];

      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', (err: any) => reject(err));
      pdfDoc.end();
    });
  }
}
