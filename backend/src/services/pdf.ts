import PDFDocument from 'pdfkit';
import type { Difficulty, GeneratedPaper } from '../types/assignment';

export interface PaperPdfInput {
  title: string;
  schoolName?: string;
  teacherName?: string;
  result?: GeneratedPaper;
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  challenging: 'Challenging',
};

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy: '#15803d',
  moderate: '#b45309',
  challenging: '#b91c1c',
};

export async function renderPaperPdf(doc: PaperPdfInput): Promise<Buffer> {
  if (!doc.result) throw new Error('Paper not generated yet');
  const paper = doc.result;

  const pdf = new PDFDocument({
    size: 'A4',
    margins: { top: 56, bottom: 56, left: 56, right: 56 },
    info: { Title: paper.title, Author: doc.teacherName ?? 'VedaAI' },
  });

  const chunks: Buffer[] = [];
  pdf.on('data', (c) => chunks.push(c as Buffer));
  const done = new Promise<Buffer>((resolve) => {
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
  });

  const school = doc.schoolName ?? 'Delhi Public School, Sector-4, Bokaro';

  pdf.font('Helvetica-Bold').fontSize(18).text(school, { align: 'center' });
  pdf.moveDown(0.2);
  pdf.font('Helvetica').fontSize(12);
  if (paper.subject) pdf.text(`Subject: ${paper.subject}`, { align: 'center' });
  if (paper.gradeLevel) pdf.text(`Class: ${paper.gradeLevel}`, { align: 'center' });
  pdf.moveDown(0.6);

  const headerY = pdf.y;
  pdf
    .fontSize(10)
    .text(
      `Time Allowed: ${paper.timeAllowedMinutes ?? 60} minutes`,
      pdf.page.margins.left,
      headerY,
      { continued: false }
    );
  pdf.text(`Maximum Marks: ${paper.totalMarks}`, pdf.page.margins.left, headerY, {
    align: 'right',
  });
  pdf.moveDown(0.6);

  pdf
    .fontSize(10)
    .fillColor('#000')
    .text('All questions are compulsory unless stated otherwise.');
  pdf.moveDown(0.8);

  pdf.fontSize(10).text('Name: ______________________________');
  pdf.moveDown(0.2);
  pdf.text('Roll Number: ______________________________');
  pdf.moveDown(0.2);
  pdf.text(`Class: ${paper.gradeLevel ?? '____'}    Section: __________`);
  pdf.moveDown(1.2);

  paper.sections.forEach((section, sIdx) => {
    if (sIdx > 0) pdf.moveDown(0.8);
    pdf
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor('#000')
      .text(section.title, { align: 'center' });
    pdf.moveDown(0.3);

    pdf
      .font('Helvetica-Oblique')
      .fontSize(10)
      .fillColor('#555')
      .text(section.instruction);
    pdf.moveDown(0.6);

    section.questions.forEach((q, qIdx) => {
      const num = `${qIdx + 1}.`;
      const badge = `[${DIFFICULTY_LABEL[q.difficulty]}]`;
      const marks = `[${q.marks} ${q.marks === 1 ? 'Mark' : 'Marks'}]`;

      pdf.font('Helvetica-Bold').fontSize(10).fillColor('#000').text(num, {
        continued: true,
      });
      pdf
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(DIFFICULTY_COLOR[q.difficulty])
        .text(` ${badge}`, { continued: true });
      pdf
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#000')
        .text(` ${q.text} `, { continued: true });
      pdf
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#555')
        .text(marks);
      pdf.fillColor('#000');

      if (q.type === 'mcq' && q.options) {
        pdf.moveDown(0.2);
        q.options.forEach((opt, oIdx) => {
          pdf
            .font('Helvetica')
            .fontSize(10)
            .text(`   ${String.fromCharCode(65 + oIdx)}. ${opt}`);
        });
      }
      pdf.moveDown(0.5);
    });
  });

  pdf
    .moveDown(0.5)
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('End of Question Paper', { align: 'center' });

  const hasAnswers = paper.sections.some((s) =>
    s.questions.some((q) => q.answer && q.answer.trim().length > 0)
  );
  if (hasAnswers) {
    pdf.addPage();
    pdf
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor('#000')
      .text('Answer Key', { align: 'center' });
    pdf.moveDown(0.8);

    let counter = 1;
    paper.sections.forEach((section) => {
      pdf
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(section.title);
      pdf.moveDown(0.3);
      section.questions.forEach((q) => {
        const ans = q.answer?.trim();
        if (!ans) {
          counter++;
          return;
        }
        pdf
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(`${counter}. `, { continued: true });
        pdf.font('Helvetica').fontSize(10).text(ans);
        pdf.moveDown(0.4);
        counter++;
      });
    });
  }

  pdf.end();
  return done;
}
