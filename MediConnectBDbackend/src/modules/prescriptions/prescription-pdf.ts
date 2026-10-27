/**
 * Generates a self-contained PDF 1.4 document buffer for a digital prescription without external
 * native dependencies. Uses standard Type1 Helvetica fonts so it renders identically in all PDF
 * viewers.
 */

import type { PrescriptionPdfData } from "./prescription.types";

function escapePdfText(text: string): string {
  return text
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(text: string, maxChars: number): string[] {
  const cleaned = text.replace(/\r?\n/g, " ").trim();
  if (!cleaned) return [];
  const words = cleaned.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function buildPrescriptionPdfBuffer(data: PrescriptionPdfData): Buffer {
  const commands: string[] = [];
  let y = 790;

  const drawText = (
    text: string,
    x: number,
    yPos: number,
    font: "F1" | "F2" = "F1",
    size = 10,
  ) => {
    commands.push(
      `BT /${font} ${size} Tf ${x} ${yPos} Td (${escapePdfText(text)}) Tj ET`,
    );
  };

  const drawRule = (yPos: number) => {
    commands.push(`0.75 G 0.75 w 45 ${yPos} m 550 ${yPos} l S`);
  };

  // Header
  drawText("MediConnect BD - Digital Prescription", 45, y, "F2", 16);
  y -= 18;
  drawText(`Verification Code: ${data.prescription.verificationCode}`, 45, y, "F2", 10);
  drawText(
    `Issued: ${new Date(data.prescription.createdAt).toISOString().slice(0, 16).replace("T", " ")} UTC`,
    340,
    y,
    "F1",
    10,
  );
  y -= 12;
  drawRule(y);
  y -= 18;

  // Doctor & Patient Details
  drawText(`Doctor: ${data.doctorName}`, 45, y, "F2", 11);
  drawText(`Patient: ${data.patientName}`, 320, y, "F2", 11);
  y -= 14;
  if (data.doctorBmdc) {
    drawText(`BMDC Reg: ${data.doctorBmdc}`, 45, y, "F1", 9);
  }
  if (data.doctorSpecialty) {
    drawText(`Specialty: ${data.doctorSpecialty}`, 180, y, "F1", 9);
  }
  if (data.consultationMode) {
    drawText(`Mode: ${data.consultationMode}`, 320, y, "F1", 9);
  }
  y -= 12;
  drawRule(y);
  y -= 20;

  // Diagnosis
  drawText("Clinical Diagnosis:", 45, y, "F2", 11);
  y -= 14;
  for (const line of wrapText(data.prescription.diagnosis, 88)) {
    drawText(line, 55, y, "F1", 10);
    y -= 13;
  }
  y -= 8;

  // Prescribed Medicines
  drawText("Rx - Prescribed Medicines:", 45, y, "F2", 11);
  y -= 15;
  data.prescription.medicines.forEach((med, index) => {
    if (y < 90) return;
    drawText(
      `${index + 1}. ${med.name} (${med.dosage})`,
      55,
      y,
      "F2",
      10,
    );
    y -= 13;
    drawText(
      `   Frequency: ${med.frequency}   |   Duration: ${med.duration}`,
      55,
      y,
      "F1",
      9,
    );
    y -= 15;
  });

  // Recommended Tests
  if (data.prescription.tests && data.prescription.tests.length > 0 && y >= 110) {
    y -= 4;
    drawText("Recommended Investigations / Tests:", 45, y, "F2", 11);
    y -= 14;
    for (const line of wrapText(data.prescription.tests.join(", "), 88)) {
      drawText(line, 55, y, "F1", 10);
      y -= 13;
    }
  }

  // Advice
  if (data.prescription.advice && y >= 110) {
    y -= 6;
    drawText("Doctor's Advice:", 45, y, "F2", 11);
    y -= 14;
    for (const line of wrapText(data.prescription.advice, 88)) {
      drawText(line, 55, y, "F1", 10);
      y -= 13;
    }
  }

  // Footer
  drawRule(65);
  drawText(
    `Verify authenticity online with code ${data.prescription.verificationCode} at MediConnect BD`,
    45,
    50,
    "F1",
    8,
  );

  const streamContent = commands.join("\n");
  const streamLength = Buffer.byteLength(streamContent, "ascii");

  const objects: string[] = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
    `6 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    const offset = String(offsets[i]).padStart(10, "0");
    pdf += `${offset} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "ascii");
}
