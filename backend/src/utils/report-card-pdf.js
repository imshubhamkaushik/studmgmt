import PDFDocument from "pdfkit";

// Renders a single-page report card from the shape produced by
// report-card.service.js's buildReportCardData(). Returns a Buffer rather
// than streaming to res directly, so the same PDF bytes can either be sent
// to a client or written to disk for the bulk classroom-generation flow.
export const renderReportCardPdf = (data) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).font("Helvetica-Bold").text("Report Card", { align: "center" });
    doc.moveDown();

    doc.fontSize(11).font("Helvetica");
    doc.text(`Student: ${data.student.name} (${data.student.studentId})`);
    doc.text(`Roll No: ${data.student.rollNo}`);
    if (data.classroom) doc.text(`Classroom: ${data.classroom}`);
    doc.moveDown();

    const tableTop = doc.y;
    doc.font("Helvetica-Bold");
    doc.text("Subject", 50, tableTop, { width: 220 });
    doc.text("Percent", 280, tableTop, { width: 100 });
    doc.text("Status", 390, tableTop, { width: 150 });

    doc.moveTo(50, tableTop + 16).lineTo(540, tableTop + 16).stroke();

    doc.font("Helvetica");
    let y = tableTop + 24;

    for (const row of data.subjects) {
      const status = row.percent == null ? "Not graded yet" : row.weightGraded < row.weightTotal ? "Partial" : "Complete";
      doc.text(row.subject.name, 50, y, { width: 220 });
      doc.text(row.percent != null ? `${row.percent}%` : "\u2014", 280, y, { width: 100 });
      doc.text(status, 390, y, { width: 150 });
      y += 20;
    }

    doc.moveTo(50, y + 4).lineTo(540, y + 4).stroke();
    doc.moveDown(2);
    doc.font("Helvetica-Bold").fontSize(13);
    doc.text(`Overall: ${data.overallPercent != null ? data.overallPercent + "%" : "Not yet available"}`, 50, y + 16);

    doc.end();
  });
