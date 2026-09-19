import ExcelJS from 'exceljs';
import { ReportRecord } from './csv.exporter.js';

export async function exportToExcelBuffer(records: ReportRecord[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Student Reward System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Point Flow Report');

  worksheet.columns = [
    { header: 'ID', key: 'id', width: 38 },
    { header: 'Timestamp', key: 'timestamp', width: 25 },
    { header: 'Correlation ID', key: 'correlationId', width: 38 },
    { header: 'Action Type', key: 'actionType', width: 22 },
    { header: 'Actor Role', key: 'actorRole', width: 14 },
    { header: 'Source Type', key: 'sourceType', width: 18 },
    { header: 'Recipient Type', key: 'recipientType', width: 18 },
    { header: 'Point Amount', key: 'pointAmount', width: 14 },
    { header: 'Task / Option', key: 'taskOption', width: 25 },
    { header: 'Reason Description', key: 'reason', width: 30 },
    { header: 'Resulting Balance', key: 'resultingBalance', width: 30 }
  ];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4E79' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Add rows
  for (const r of records) {
    worksheet.addRow({
      id: r.id,
      timestamp: new Date(r.eventTimestamp).toISOString(),
      correlationId: r.correlationId,
      actionType: r.actionType,
      actorRole: r.actorRole,
      sourceType: r.sourceType ?? '',
      recipientType: r.recipientType ?? '',
      pointAmount: r.pointAmount,
      taskOption: r.taskName ? `${r.taskName}${r.pointOption ? ` (${r.pointOption} pts)` : ''}` : '',
      reason: r.reasonDescription ?? '',
      resultingBalance:
        typeof r.resultingBalanceState === 'object'
          ? JSON.stringify(r.resultingBalanceState)
          : String(r.resultingBalanceState ?? '')
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
