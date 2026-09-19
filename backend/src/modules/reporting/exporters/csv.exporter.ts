import { stringify } from 'csv-stringify';
import { Readable } from 'node:stream';

export interface ReportRecord {
  id: string;
  correlationId: string;
  eventTimestamp: string | Date;
  actionType: string;
  actorRole: string;
  sourceType?: string | null;
  recipientType?: string | null;
  pointAmount: number;
  taskName?: string | null;
  pointOption?: number | null;
  reasonDescription?: string | null;
  resultingBalanceState?: any;
}

export function exportToCsvStream(records: ReportRecord[]): Readable {
  const rows = records.map((r) => [
    r.id,
    new Date(r.eventTimestamp).toISOString(),
    r.correlationId,
    r.actionType,
    r.actorRole,
    r.sourceType ?? '',
    r.recipientType ?? '',
    r.pointAmount,
    r.taskName ? `${r.taskName}${r.pointOption ? ` (${r.pointOption} pts)` : ''}` : '',
    r.reasonDescription ?? '',
    typeof r.resultingBalanceState === 'object'
      ? JSON.stringify(r.resultingBalanceState)
      : String(r.resultingBalanceState ?? '')
  ]);

  const stringifier = stringify({
    header: true,
    columns: [
      'ID',
      'Timestamp',
      'Correlation ID',
      'Action Type',
      'Actor Role',
      'Source Type',
      'Recipient Type',
      'Point Amount',
      'Task / Option',
      'Reason',
      'Resulting Balance'
    ]
  });

  const readable = new Readable({
    read() {}
  });

  stringifier.on('data', (chunk) => readable.push(chunk));
  stringifier.on('end', () => readable.push(null));
  stringifier.on('error', (err) => readable.destroy(err));

  for (const row of rows) {
    stringifier.write(row);
  }
  stringifier.end();

  return readable;
}
