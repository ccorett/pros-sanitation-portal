import type { Payslip } from "@/lib/hr-mock-data";

export function buildMockPayslipPdf(payslip: Payslip, employeeName: string): Buffer {
  const lines = [
    `Pro's Sanitation - Payslip`,
    `Employee: ${employeeName}`,
    `Period: ${payslip.periodLabel}`,
    `Pay Date: ${payslip.payDate}`,
    `Mock document for preview only.`,
  ];

  const contentStream = [
    "BT",
    "/F1 14 Tf",
    "50 750 Td",
    `(${escapePdfText(lines[0])}) Tj`,
    "0 -24 Td",
    `(${escapePdfText(lines[1])}) Tj`,
    "0 -24 Td",
    `(${escapePdfText(lines[2])}) Tj`,
    "0 -24 Td",
    `(${escapePdfText(lines[3])}) Tj`,
    "0 -24 Td",
    `(${escapePdfText(lines[4])}) Tj`,
    "ET",
  ].join("\n");

  const streamLength = Buffer.byteLength(contentStream, "utf8");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${streamLength} >> stream\n${contentStream}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${object}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
