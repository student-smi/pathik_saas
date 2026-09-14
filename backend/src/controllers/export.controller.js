/**
 * EXPORT CONTROLLER
 * Generates Excel and PDF exports of monthly bills.
 */
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { PrismaClient } = require('@prisma/client');
const { monthLabel } = require('../services/bill.service');
const prisma = new PrismaClient();

// Helper: verify admin owns the bill
async function getBillForAdmin(billId, adminId) {
  const bill = await prisma.monthlyBill.findUnique({
    where: { id: billId },
    include: {
      entries: {
        include: { house: { include: { resident: true } } },
        orderBy: { house: { houseNo: 'asc' } }
      },
      society: true
    }
  });
  if (!bill) throw Object.assign(new Error('Bill not found'), { status: 404 });

  const society = await prisma.society.findFirst({
    where: { id: bill.societyId, adminId }
  });
  if (!society) throw Object.assign(new Error('Access denied'), { status: 403 });

  return bill;
}

// GET /api/export/excel/:billId
const exportExcel = async (req, res, next) => {
  try {
    const bill = await getBillForAdmin(req.params.billId, req.user.id);
    const label = monthLabel(bill.year, bill.month);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Water Bill System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(`${label}`);

    // Header rows
    sheet.mergeCells('A1:L1');
    sheet.getCell('A1').value = bill.society.name;
    sheet.getCell('A1').font = { bold: true, size: 14 };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:L2');
    sheet.getCell('A2').value = `Water Bill — ${label}`;
    sheet.getCell('A2').font = { bold: true, size: 12 };
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    // Column headers (matching the original bill format)
    const headers = ['Home No.', 'H.V', 'A.V', 'UNIT', 'AA', 'B', 'DAN', 'V', 'FALO', 'WCH', 'TOTAL', 'Status'];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    // Set column widths
    sheet.columns = [
      { width: 12 }, { width: 10 }, { width: 10 }, { width: 10 },
      { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 },
      { width: 10 }, { width: 10 }, { width: 12 }, { width: 12 }
    ];

    // Data rows
    for (const entry of bill.entries) {
      const row = sheet.addRow([
        entry.house.houseNo,
        entry.hv ?? '',
        entry.av ?? '',
        entry.unit ?? '',
        entry.aa ?? '',
        entry.b ?? '',
        entry.dan ?? '',
        entry.v ?? '',
        entry.falo ?? '',
        entry.wch ?? '',
        entry.total ?? '',
        bill.status
      ]);

      // Highlight negative UNIT in red
      if (entry.isNegative) {
        row.getCell(4).font = { color: { argb: 'FFDC2626' } };
        row.getCell(9).font = { color: { argb: 'FFDC2626' } };
        row.getCell(11).font = { color: { argb: 'FFDC2626' } };
      }

      row.eachCell((cell) => {
        cell.alignment = { horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });
    }

    // Totals row
    const totals = bill.entries.reduce(
      (acc, e) => ({
        unit: acc.unit + (e.unit || 0),
        falo: acc.falo + (e.falo || 0),
        total: acc.total + (e.total || 0)
      }),
      { unit: 0, falo: 0, total: 0 }
    );

    const totalRow = sheet.addRow(['TOTAL', '', '', totals.unit, '', '', '', '', totals.falo, '', totals.total, '']);
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      cell.alignment = { horizontal: 'center' };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="water-bill-${label.replace(' ', '-')}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

// GET /api/export/pdf/:billId
const exportPdf = async (req, res, next) => {
  try {
    const bill = await getBillForAdmin(req.params.billId, req.user.id);
    const label = monthLabel(bill.year, bill.month);

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="water-bill-${label.replace(' ', '-')}.pdf"`);
    doc.pipe(res);

    // Title
    doc.fontSize(16).font('Helvetica-Bold').text(bill.society.name, { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(`Water Bill — ${label} [${bill.status}]`, { align: 'center' });
    doc.moveDown(1);

    // Table
    const cols = ['Home No.', 'H.V', 'A.V', 'UNIT', 'V', 'FALO', 'TOTAL'];
    const colWidths = [70, 70, 70, 70, 70, 70, 70];
    const startX = 40;
    let y = doc.y;

    // Header row
    doc.font('Helvetica-Bold').fontSize(9);
    let x = startX;
    for (let i = 0; i < cols.length; i++) {
      doc.rect(x, y, colWidths[i], 20).fillAndStroke('#1E40AF', '#1E40AF');
      doc.fillColor('white').text(cols[i], x + 2, y + 5, { width: colWidths[i] - 4, align: 'center' });
      x += colWidths[i];
    }
    doc.fillColor('black');
    y += 20;

    // Data rows
    doc.font('Helvetica').fontSize(9);
    for (const entry of bill.entries) {
      const rowData = [
        entry.house.houseNo,
        entry.hv ?? '-',
        entry.av ?? '-',
        entry.unit ?? '-',
        entry.v ?? '-',
        entry.falo ?? '-',
        entry.total ?? '-'
      ];

      x = startX;
      const bgColor = entry.isNegative ? '#FEF2F2' : (bill.entries.indexOf(entry) % 2 === 0 ? '#F9FAFB' : 'white');
      const textColor = entry.isNegative ? '#DC2626' : 'black';

      for (let i = 0; i < rowData.length; i++) {
        doc.rect(x, y, colWidths[i], 18).fillAndStroke(bgColor, '#D1D5DB');
        doc.fillColor(textColor).text(String(rowData[i]), x + 2, y + 4, { width: colWidths[i] - 4, align: 'center' });
        x += colWidths[i];
      }
      doc.fillColor('black');
      y += 18;

      // Page break if needed
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 40;
      }
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#6B7280')
      .text(`Generated on ${new Date().toLocaleString()}`, { align: 'right' });

    doc.end();
  } catch (err) {
    next(err);
  }
};

module.exports = { exportExcel, exportPdf };
