const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const reshaper = require('arabic-persian-reshaper').ArabicReshaper;
const bidi = require('bidi-js')();
const prisma = require('../../config/database');
const { ValidationError } = require('../../errors');

const FONT_REGULAR = path.join(__dirname, '../../assets/fonts/Cairo-Regular.ttf');
const FONT_BOLD = path.join(__dirname, '../../assets/fonts/Cairo-Bold.ttf');

function isValidFontFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    const signature = buffer.toString('ascii');
    const isTtf = buffer.equals(Buffer.from([0x00, 0x01, 0x00, 0x00]));
    const isTrueType = signature === 'true';
    const isOpenType = signature === 'OTTO';
    const isTtc = signature === 'ttcf';

    return isTtf || isTrueType || isOpenType || isTtc;
  } catch {
    return false;
  }
}

/**
 * Helper to prepare RTL text for PDFKit
 */
function prepareRTL(text) {
  if (!text) return '';
  // 1. Reshape Arabic characters (handle connected forms)
  const reshaped = reshaper.reshape(text);
  // 2. Reorder for RTL display
  const reordered = bidi.getReorderedText(reshaped);
  return reordered;
}

/**
 * Generate revenue report for a date range.
 */
async function generateRevenueData({ startDate, endDate, driverId }) {
  if (!startDate || !endDate) throw new ValidationError('Start and end dates required');

  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ValidationError('Invalid date format');
  }

  end.setHours(23, 59, 59, 999); // Set to end of the day

  const dayDiff = (end - start) / (1000 * 60 * 60 * 24);
  if (dayDiff > 90) throw new ValidationError('Date range cannot exceed 90 days');

  const where = {
    status: 'COMPLETED',
    actualEndTime: { gte: start, lte: end },
    ...(driverId && { driverId }),
  };

  const trips = await prisma.trip.findMany({
    where,
    include: {
      driver: { select: { id: true, name: true, email: true } },
      vehicle: { select: { id: true, plateNumber: true } },
    },
    orderBy: { actualEndTime: 'asc' },
  });

  if (trips.length === 0) {
    throw new ValidationError('REPORT_EMPTY_DATA', 'No completed trips found in this period / لا توجد رحلات مكتملة في هذه الفترة');
  }


  // Get approved expenses in range
  const expenseWhere = {
    status: { equals: 'approved', mode: 'insensitive' },
    createdAt: { gte: start, lte: end },
    ...(driverId && { driverId }),
  };

  const expenses = await prisma.expense.findMany({
    where: expenseWhere,
    include: {
      category: { select: { name: true } },
      driver: { select: { id: true, name: true } },
    },
  });

  // Aggregate by driver
  const driverMap = {};
  for (const trip of trips) {
    const did = trip.driverId;
    if (!driverMap[did]) {
      driverMap[did] = {
        driverId: did,
        driverName: trip.driver.name,
        totalRevenue: 0,
        totalExpenses: 0,
        tripCount: 0,
        trips: [],
      };
    }
    driverMap[did].totalRevenue += parseFloat(trip.price);
    driverMap[did].tripCount += 1;
    driverMap[did].trips.push(trip);
  }

  for (const expense of expenses) {
    const did = expense.driverId;
    if (!driverMap[did]) {
      driverMap[did] = {
        driverId: did,
        driverName: expense.driver.name,
        totalRevenue: 0,
        totalExpenses: 0,
        tripCount: 0,
        trips: [],
      };
    }
    driverMap[did].totalExpenses += parseFloat(expense.amount);
  }

  const driverSummaries = Object.values(driverMap).map((d) => ({
    ...d,
    netRevenue: d.totalRevenue - d.totalExpenses,
  }));

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    totalRevenue: driverSummaries.reduce((s, d) => s + d.totalRevenue, 0),
    totalExpenses: driverSummaries.reduce((s, d) => s + d.totalExpenses, 0),
    netRevenue: driverSummaries.reduce((s, d) => s + d.netRevenue, 0),
    driverSummaries,
    tripCount: trips.length,
    trips,
    expenses,
  };
}

/**
 * Generate PDF report.
 */
async function generatePDF(reportData, res) {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=revenue_report.pdf');
  doc.pipe(res);

  // Register Fonts (fallback to built-in fonts if custom fonts fail)
  try {
    const hasRegular = isValidFontFile(FONT_REGULAR);
    const hasBold = isValidFontFile(FONT_BOLD);
    if (hasRegular) doc.registerFont('Cairo', FONT_REGULAR);
    if (hasBold) doc.registerFont('Cairo-Bold', FONT_BOLD);
    if (hasRegular) {
      doc.font('Cairo');
    } else {
      doc.font('Helvetica');
    }
  } catch (err) {
    console.warn('[REPORT_WARN] Failed to load custom fonts, using default.', err.message);
    doc.font('Helvetica');
  }

  // Header
  doc.fontSize(20).font('Cairo-Bold').text(prepareRTL('Fleet Management — Revenue Report / تقرير الإيرادات'), { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).font('Cairo').text(prepareRTL(`Period / الفترة: ${reportData.startDate.slice(0, 10)} to ${reportData.endDate.slice(0, 10)}`));
  doc.moveDown();

  // Summary table
  doc.fontSize(14).font('Cairo-Bold').text(prepareRTL('Summary / الملخص'), { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).font('Cairo');
  doc.text(prepareRTL(`Total Revenue / إجمالي الإيرادات: ${reportData.totalRevenue.toFixed(2)} EGP`));
  doc.text(prepareRTL(`Total Expenses / إجمالي المصروفات: ${reportData.totalExpenses.toFixed(2)} EGP`));
  doc.text(prepareRTL(`Net Revenue / صافي الربح: ${reportData.netRevenue.toFixed(2)} EGP`));
  doc.text(prepareRTL(`Total Trips / عدد الرحلات: ${reportData.tripCount}`));
  doc.moveDown();

  // Driver breakdown
  doc.fontSize(14).font('Cairo-Bold').text(prepareRTL('Driver Breakdown / تفاصيل السائقين'), { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).font('Cairo');
  for (const driver of reportData.driverSummaries) {
    doc.text(prepareRTL(`${driver.driverName}: Revenue ${driver.totalRevenue.toFixed(2)} EGP | Expenses ${driver.totalExpenses.toFixed(2)} EGP | Net ${driver.netRevenue.toFixed(2)} EGP | Trips: ${driver.tripCount}`));
  }

  doc.end();
}

/**
 * Generate Excel report.
 */
async function generateExcel(reportData, res) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fleet Management System';

  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric / المقياس', key: 'metric', width: 30 },
    { header: 'Value / القيمة', key: 'value', width: 25 },
  ];
  summarySheet.addRow({ metric: 'Period Start / بداية الفترة', value: reportData.startDate.slice(0, 10) });
  summarySheet.addRow({ metric: 'Period End / نهاية الفترة', value: reportData.endDate.slice(0, 10) });
  summarySheet.addRow({ metric: 'Total Revenue (EGP) / إجمالي الإيرادات', value: reportData.totalRevenue });
  summarySheet.addRow({ metric: 'Total Expenses (EGP) / إجمالي المصروفات', value: reportData.totalExpenses });
  summarySheet.addRow({ metric: 'Net Revenue (EGP) / صافي الربح', value: reportData.netRevenue });
  summarySheet.addRow({ metric: 'Total Trips / عدد الرحلات', value: reportData.tripCount });

  // Drivers sheet
  const driverSheet = workbook.addWorksheet('Drivers');
  driverSheet.columns = [
    { header: 'Driver / السائق', key: 'name', width: 25 },
    { header: 'Revenue (EGP) / الإيرادات', key: 'revenue', width: 20 },
    { header: 'Expenses (EGP) / المصروفات', key: 'expenses', width: 20 },
    { header: 'Net (EGP) / الصافي', key: 'net', width: 20 },
    { header: 'Trips / الرحلات', key: 'trips', width: 15 },
  ];
  for (const d of reportData.driverSummaries) {
    driverSheet.addRow({
      name: d.driverName, revenue: d.totalRevenue,
      expenses: d.totalExpenses, net: d.netRevenue, trips: d.tripCount,
    });
  }

  // Trips sheet
  const tripsSheet = workbook.addWorksheet('Trips');
  tripsSheet.columns = [
    { header: 'Date / التاريخ', key: 'date', width: 25 },
    { header: 'Driver / السائق', key: 'driver', width: 25 },
    { header: 'Vehicle / المركبة', key: 'vehicle', width: 20 },
    { header: 'Pickup / موقع الركوب', key: 'pickup', width: 35 },
    { header: 'Dropoff / المحطة الأخيرة', key: 'dropoff', width: 35 },
    { header: 'Price / السعر', key: 'price', width: 15 },
    { header: 'Status / الحالة', key: 'status', width: 15 },
  ];
  for (const t of reportData.trips) {
    tripsSheet.addRow({
      date: t.actualEndTime?.toISOString().slice(0, 19),
      driver: t.driver.name,
      vehicle: t.vehicle.plateNumber,
      pickup: t.pickupLocation,
      dropoff: t.dropoffLocation,
      price: parseFloat(t.price),
      status: t.status,
    });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=revenue_report.xlsx');
  await workbook.xlsx.write(res);
}

module.exports = { generateRevenueData, generatePDF, generateExcel };
