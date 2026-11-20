import React from "react";
import ReportSummary from "./ReportSummary.jsx";
import DeliveryTable from "./DeliveryTable.jsx";
import PaymentTable from "./PaymentTable.jsx";
import TransactionTable from "./TransactionTable.jsx";
import InterestTable from "./InterestTable.jsx";
import SettlementTable from "./SettlementTable.jsx";
import { useTranslation } from "../../lib/i18n.jsx";

function inr(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function dateText(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function buildFarmerStatementPdf(report, config = {}) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ unit: "mm", format: "a4", putOnlyUsedFonts: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;

  // Design System Exact Multi-Color Section Palette
  const slateDark = [15, 23, 42];        // #0F172A
  const slateMuted = [71, 85, 105];      // #475569
  const amberBar = [245, 158, 11];       // #F59E0B
  const darkInk = [30, 41, 59];          // #1E293B
  const cardBorder = [226, 232, 240];    // #E2E8F0

  const blueTheme = {
    header: [29, 78, 216],      // #1D4ED8 Royal Blue
    bg: [239, 246, 255],        // #EFF6FF
    border: [191, 219, 254],    // #BFDBFE
  };
  const amberTheme = {
    header: [180, 83, 9],       // #B45309 Warm Amber
    bg: [255, 251, 235],        // #FFFBEB
    border: [253, 230, 138],    // #FDE68A
  };
  const emeraldTheme = {
    header: [4, 120, 87],       // #047857 Emerald Green
    bg: [236, 253, 245],        // #ECFDF5
    border: [167, 243, 208],    // #A7F3D0
  };
  const skyTheme = {
    header: [3, 105, 161],      // #0369A1 Sky Blue
    bg: [240, 249, 255],        // #F0F9FF
    border: [186, 230, 253],    // #BAE6FD
  };
  const violetTheme = {
    header: [109, 40, 217],     // #6D28D9 Violet
    bg: [245, 243, 255],        // #F5F3FF
    border: [221, 214, 254],    // #DDD6FE
  };
  const tealTheme = {
    header: [15, 118, 110],     // #0F766E Deep Teal
    bg: [240, 253, 250],        // #F0FDFA
    border: [153, 246, 228],    // #99F6E4
  };
  const crimsonTheme = {
    header: [190, 18, 60],      // #BE123C Crimson
    bg: [255, 241, 242],        // #FFF1F2
    border: [254, 205, 211],    // #FECDD3
  };

  let y = 10;

  const amountText = (value) => {
    if (value == null) return "Unavailable";
    return `Rs. ${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const isSethOwes = report.balancePosition === "seth_owes_farmer";
  const isFarmerOwes = report.balancePosition === "farmer_owes_seth";
  const isNoDue = report.balancePosition === "no_net_jama_due";
  const positionTitle = isSethOwes
    ? "Seth owes the farmer"
    : isFarmerOwes
    ? "Farmer owes the Seth"
    : isNoDue
    ? "No net Jama due"
    : "Jama position unavailable";

  // --- 1. MASTHEAD BANNER (Deep Slate #0F172A with Amber #F59E0B Accent Bar) ---
  doc.setFillColor(...slateDark);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "F");

  // Amber accent bottom stripe
  doc.setFillColor(...amberBar);
  doc.rect(margin, y + 21, contentWidth, 1.2, "F");

  // Brand Name: Saaf (White) + Hisaab (Amber)
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Saaf ", margin + 5, y + 8.5);
  const saafWidth = doc.getTextWidth("Saaf ");
  doc.setTextColor(...amberBar);
  doc.text("Hisaab", margin + 5 + saafWidth, y + 8.5);

  doc.setTextColor(203, 213, 225);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Farmer Account Statement", margin + 5, y + 15.5);

  // Right: Period Badge Pill & Date
  const periodString = `${dateText(report.period.from)} - ${dateText(report.period.to)}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...amberBar);
  doc.text(`Period: ${periodString}`, pageWidth - margin - 5, y + 8.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(226, 232, 240);
  doc.text(`Generated: ${dateText(report.generatedAt)}`, pageWidth - margin - 5, y + 15.5, { align: "right" });

  y += 27;

  // --- 2. FARMER & NET STANDING HERO GRID (2 Columns) ---
  const colWidth = (contentWidth - 4) / 2;
  const heroCardHeight = 26;

  // Left Card: Farmer Particulars
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...cardBorder);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, y, colWidth, heroCardHeight, 2, 2, "FD");

  // Left accent stripe (Deep Slate)
  doc.setFillColor(...slateDark);
  doc.roundedRect(margin, y, 2.5, heroCardHeight, 1, 1, "F");

  doc.setTextColor(...slateMuted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.text("FARMER PARTICULARS", margin + 6, y + 5.5);

  doc.setTextColor(...darkInk);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(report.farmer.name, margin + 6, y + 11.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(...slateMuted);
  const farmerLines = [
    report.farmer.phone ? `Phone: ${report.farmer.phone}` : null,
    report.farmer.village ? `Village: ${report.farmer.village}` : null,
    report.farmer.fatherName ? `Father: ${report.farmer.fatherName}` : null,
    report.farmer.address && !report.farmer.village ? `Address: ${report.farmer.address}` : null,
  ].filter(Boolean);

  let farmerLineY = y + 16.5;
  const lineDetails = farmerLines.slice(0, 2).join("  |  ");
  if (lineDetails) doc.text(lineDetails, margin + 6, farmerLineY);
  if (farmerLines.length > 2) doc.text(farmerLines.slice(2).join("  |  "), margin + 6, farmerLineY + 4.5);

  // Right Card: Current Net Standing Box
  const rightColX = margin + colWidth + 4;
  doc.setFillColor(...(isSethOwes ? emeraldTheme.bg : isFarmerOwes ? amberTheme.bg : [248, 250, 252]));
  doc.setDrawColor(...(isSethOwes ? emeraldTheme.border : isFarmerOwes ? amberTheme.border : cardBorder));
  doc.roundedRect(rightColX, y, colWidth, heroCardHeight, 2, 2, "FD");

  // Right accent stripe
  doc.setFillColor(...(isSethOwes ? emeraldTheme.header : isFarmerOwes ? amberTheme.header : slateMuted));
  doc.roundedRect(rightColX + colWidth - 2.5, y, 2.5, heroCardHeight, 1, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(...(isSethOwes ? emeraldTheme.header : isFarmerOwes ? amberTheme.header : slateMuted));
  doc.text("CURRENT NET STANDING", rightColX + 5, y + 5.5);

  doc.setFontSize(13);
  doc.setTextColor(...(isSethOwes ? [6, 78, 59] : isFarmerOwes ? [120, 53, 15] : darkInk));
  const jamaClosing = report.closingBalance?.jama;
  const displayAmount = jamaClosing != null ? amountText(Math.abs(jamaClosing)) : "Unavailable";
  doc.text(displayAmount, rightColX + 5, y + 13.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(...(isSethOwes ? emeraldTheme.header : isFarmerOwes ? amberTheme.header : slateMuted));
  doc.text(positionTitle, rightColX + 5, y + 19.5);

  y += heroCardHeight + 5;

  // --- 3. SECTION 1: ACCOUNT BALANCES (Royal Blue #1D4ED8) ---
  doc.setFillColor(...blueTheme.header);
  doc.roundedRect(margin, y, contentWidth, 6, 1.2, 1.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("Balances", margin + 4, y + 4.2);
  y += 7.5;

  const tileWidth = (contentWidth - 6) / 3;
  const tileHeight = 20;
  const balanceTiles = [
    { title: "Jama Balance", opening: report.openingBalance?.jama, closing: report.closingBalance?.jama },
    { title: "Loan Principal", opening: report.openingBalance?.principal, closing: report.closingBalance?.principal },
    { title: "Outstanding Interest", opening: report.openingBalance?.interest, closing: report.closingBalance?.interest },
  ];

  balanceTiles.forEach((tile, index) => {
    const x = margin + index * (tileWidth + 3);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...blueTheme.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, tileWidth, tileHeight, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...blueTheme.header);
    doc.text(tile.title, x + 3.5, y + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(...slateMuted);
    doc.text("Opening:", x + 3.5, y + 10.5);
    doc.text("Closing:", x + 3.5, y + 16);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkInk);
    doc.text(amountText(tile.opening), x + tileWidth - 3.5, y + 10.5, { align: "right" });
    doc.text(amountText(tile.closing), x + tileWidth - 3.5, y + 16, { align: "right" });
  });

  y += tileHeight + 5;

  // --- 4. SECTION 2: ACTIVITY IN THIS PERIOD (Warm Amber #B45309) ---
  const summary = report.summary || {};
  const essentialSummary = [
    [
      "Crop Deliveries (Net Value)",
      amountText(summary.totalNetDeliveryValue),
      "Settlement Payouts (Direct Paid)",
      amountText(summary.totalSettlementPayouts),
    ],
    [
      "Payments Given to Farmer",
      amountText(summary.totalPayments),
      "Advances Given to Farmer",
      amountText(summary.totalAdvances),
    ],
    [
      "Deposits Received from Farmer",
      amountText(summary.totalDeposits),
      "Interest Generated in Period",
      amountText(summary.totalInterestGenerated),
    ],
  ];

  doc.setFillColor(...amberTheme.header);
  doc.roundedRect(margin, y, contentWidth, 6, 1.2, 1.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("Activity in this period", margin + 4, y + 4.2);
  y += 7;

  autoTable(doc, {
    startY: y,
    tableWidth: contentWidth,
    body: essentialSummary,
    theme: "plain",
    styles: { fontSize: 7.2, cellPadding: 1.8, textColor: darkInk, lineColor: amberTheme.border, lineWidth: 0.15 },
    columnStyles: {
      0: { cellWidth: 50, textColor: slateMuted },
      1: { cellWidth: 38, fontStyle: "bold", halign: "right" },
      2: { cellWidth: 52, textColor: slateMuted },
      3: { cellWidth: 50, fontStyle: "bold", halign: "right" },
    },
    margin: { left: margin, right: margin, bottom: 12 },
  });

  y = doc.lastAutoTable.finalY + 5;

  // Reusable multi-color Section Table Helper
  const addThemedSectionTable = (title, headers, body, theme, columnStyles = {}) => {
    if (y > pageHeight - 34) {
      doc.addPage();
      y = 12;
    }

    doc.setFillColor(...theme.header);
    doc.roundedRect(margin, y, contentWidth, 6, 1.2, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 4, y + 4.2);

    // Filter out any blank, empty, or invalid spacer rows
    const cleanBody = (Array.isArray(body) ? body : [])
      .filter((row) => Array.isArray(row) && row.length > 0 && row.some((c) => c !== "" && c != null));

    autoTable(doc, {
      startY: y + 6.5,
      tableWidth: contentWidth,
      head: [headers],
      body: cleanBody.length ? cleanBody : [headers.map((_, i) => (i === 0 ? "No records in this period" : ""))],
      theme: "striped",
      styles: {
        font: "helvetica",
        fontSize: 7.2,
        cellPadding: 2,
        valign: "middle",
        textColor: darkInk,
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: theme.header,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        lineColor: theme.header,
      },
      alternateRowStyles: { fillColor: theme.bg },
      columnStyles,
      margin: { left: margin, right: margin, bottom: 12 },
      showHead: "everyPage",
      rowPageBreak: "avoid",
    });

    y = doc.lastAutoTable.finalY + 5;
  };

  // --- 5. SECTION 3: CROP DELIVERY RECORDS (Emerald Green #047857) ---
  if (config.deliveryDetail !== "hide") {
    const deliveries = config.deliveryDetail === "recent5"
      ? report.deliveries.slice(-5)
      : report.deliveries;

    if (config.deliveryDetail === "summary") {
      addThemedSectionTable(
        "Delivery summary",
        ["Deliveries", "Net value", "Approved", "Pending", "Held"],
        [[
          report.deliveries.length,
          amountText(summary.totalNetDeliveryValue),
          summary.deliveryStatuses?.approved?.count ?? 0,
          summary.deliveryStatuses?.pending?.count ?? 0,
          summary.deliveryStatuses?.held?.count ?? 0,
        ]],
        emeraldTheme,
        { 1: { halign: "right", fontStyle: "bold" } }
      );
    } else {
      addThemedSectionTable(
        "Delivery records",
        ["Date / Crop", "Bags & Weight", "Rate & Deductions", "Net Amount", "Status", "Bori Weights"],
        deliveries.map((item) => {
          let bagWeightsText = "—";
          if (Array.isArray(item.bagWeights) && item.bagWeights.length > 0) {
            // Strict format without # symbols: 1: 60kg, 2: 62kg, etc.
            // Space after colon and comma separator, keeping each N: XXkg intact
            const formattedBags = item.bagWeights.map((w, idx) => `${idx + 1}: ${w}kg`);
            const lines = [];
            for (let i = 0; i < formattedBags.length; i += 4) {
              lines.push(formattedBags.slice(i, i + 4).join(", "));
            }
            bagWeightsText = lines.join("\n");
          }
          return [
            `${dateText(item.date)}\n${item.crop ? item.crop.charAt(0).toUpperCase() + item.crop.slice(1) : "—"}`,
            `${item.bags || 0} bori\nNet: ${item.netWeight || item.totalWeight || 0} kg\nGross: ${item.totalWeight || 0} kg`,
            `Rate: ${amountText(item.ratePerKg)}/kg${Number(item.kardaWeight || 0) > 0 ? `\nKarda: -${item.kardaWeight} kg` : ""}${Number(item.palledariAmount || 0) > 0 ? `\nPalledari: -${amountText(item.palledariAmount)}` : ""}`,
            amountText(item.netAmount),
            item.status ? item.status.toUpperCase() : "APPROVED",
            bagWeightsText,
          ];
        }),
        emeraldTheme,
        {
          0: { cellWidth: 28 }, // 14.7% width (79.4pt) prevents date wrapping
          1: { cellWidth: 27 },
          2: { cellWidth: 32 },
          3: { cellWidth: 26, halign: "right", fontStyle: "bold" },
          4: { cellWidth: 20, halign: "center", fontStyle: "bold", fontSize: 7 },
          5: { cellWidth: 57, fontSize: 6.8, cellPadding: 1.5 },
        }
      );
    }
  }

  // --- 6. SECTION 4: PAYMENTS GIVEN (Sky Blue #0369A1) ---
  if (config.payments) {
    addThemedSectionTable(
      "Payments",
      ["Date", "Amount", "Mode", "Paid by"],
      report.payments.map((item) => [
        dateText(item.date),
        amountText(item.amount),
        item.paymentMode || "Cash",
        item.paidBy || "seth",
      ]),
      skyTheme,
      {
        0: { cellWidth: 32 },
        1: { cellWidth: 42, halign: "right", fontStyle: "bold" },
        2: { cellWidth: 38 },
        3: { cellWidth: 78 },
      }
    );
  }

  // --- 7. SECTION 5: OTHER TRANSACTIONS (Violet #6D28D9) ---
  if (config.transactions) {
    addThemedSectionTable(
      "Other transactions",
      ["Date", "Type", "Amount / Bags", "Mode / Paid by"],
      report.transactions.map((item) => [
        dateText(item.date),
        item.type ? item.type.replace("_", " ").toUpperCase() : "—",
        item.amount == null ? `${item.bags ?? 0} bags` : amountText(item.amount),
        [item.paymentMode, item.paidBy].filter(Boolean).join(" / ") || "—",
      ]),
      violetTheme,
      {
        0: { cellWidth: 32 },
        1: { cellWidth: 42 },
        2: { cellWidth: 42, halign: "right", fontStyle: "bold" },
        3: { cellWidth: 74 },
      }
    );
  }

  // --- 8. SECTION 6: SETTLEMENTS (Deep Teal #0F766E) ---
  if (config.settlements) {
    addThemedSectionTable(
      "Settlements",
      ["Date", "Crop Value", "Recoveries / Cuts", "Final Payout", "Payment Method", "Status"],
      report.settlements.map((item) => [
        dateText(item.date),
        amountText(item.cropAmount),
        `Adv: ${amountText(item.principalRecovered)} | Int: ${amountText(item.interestRecovered)} | Jama: ${amountText(item.jamaRecovered)}`,
        amountText(item.finalAmount),
        String(item.paymentMethod).toLowerCase() === "jama" ? "Credited to Jama" : (item.paymentMethod || "Cash"),
        item.status ? item.status.toUpperCase() : "COMPLETED",
      ]),
      tealTheme,
      {
        0: { cellWidth: 24 },
        1: { cellWidth: 26, halign: "right" },
        2: { cellWidth: 56 },
        3: { cellWidth: 29, halign: "right", fontStyle: "bold" },
        4: { cellWidth: 29 },
        5: { cellWidth: 26, halign: "center", fontStyle: "bold", fontSize: 7, cellPadding: 1.5 },
      }
    );
  }

  // --- 9. SECTION 7: INTEREST HISTORY (Crimson #BE123C) ---
  if (config.interest) {
    const validInterest = (report.interest || []).filter(
      (item) => item && (item.fromDate || item.interestAmount != null)
    );
    addThemedSectionTable(
      "Interest history",
      ["Accrual period", "Duration", "Principal", "Monthly rate", "Interest generated"],
      validInterest.map((item) => [
        `${dateText(item.fromDate)} - ${dateText(item.toDate)}`,
        `${item.days || 0} days`,
        amountText(item.principalAmount),
        `${item.monthlyRate}% / mo`,
        amountText(item.interestAmount),
      ]),
      crimsonTheme,
      {
        0: { cellWidth: 46 },
        1: { cellWidth: 24 },
        2: { cellWidth: 40, halign: "right" },
        3: { cellWidth: 38 },
        4: { cellWidth: 42, halign: "right", fontStyle: "bold" },
      }
    );
  }

  // --- 10. DUAL SIGNATURE BLOCK ---
  if (y > pageHeight - 30) {
    doc.addPage();
    y = 14;
  }
  y += 4;
  const sigBoxWidth = (contentWidth - 10) / 2;
  doc.setDrawColor(...cardBorder);
  doc.setLineWidth(0.2);
  doc.line(margin, y + 14, margin + sigBoxWidth, y + 14);
  doc.line(margin + sigBoxWidth + 10, y + 14, pageWidth - margin, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...slateMuted);
  doc.text("Farmer Signature / Thumb", margin + sigBoxWidth / 2, y + 18.5, { align: "center" });
  doc.text("Authorized Signatory / Munsi", margin + sigBoxWidth + 10 + sigBoxWidth / 2, y + 18.5, { align: "center" });

  // --- 11. PERSISTENT FOOTER ON EVERY PAGE ---
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 8, pageWidth - margin, pageHeight - 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...slateMuted);
    doc.text(`${report.farmer.name} | Period: ${report.period.from} to ${report.period.to}`, margin, pageHeight - 5);
    doc.text(`Generated by Saaf Hisaab | Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: "right" });
  }

  doc.setTextColor(0);
  return doc;
}

export default function FarmerReportPreview({ report, config, language, onEdit, onClose }) {
  const { t } = useTranslation();

  React.useEffect(() => {
    const handleBeforePrint = () => {
      document.body.classList.add("printing-statement");
    };
    const handleAfterPrint = () => {
      document.body.classList.remove("printing-statement");
    };
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.body.classList.remove("printing-statement");
    };
  }, []);

  const deliveries = config.deliveryDetail === "recent5"
    ? report.deliveries.slice(-5)
    : config.deliveryDetail === "summary" || config.deliveryDetail === "hide"
      ? []
      : report.deliveries;

  async function makePdf() {
    const doc = await buildFarmerStatementPdf(report, config);
    return doc.output("blob");
  }

  async function download() {
    const doc = await buildFarmerStatementPdf(report, config);
    doc.save(`Farmer-Statement-${report.farmer.name.replace(/[^a-z0-9_-]/gi, "_")}-${report.period.from}-${report.period.to}.pdf`);
  }

  async function share() {
    const text = `Farmer statement for ${report.farmer.name}, ${report.period.from} to ${report.period.to}`;
    try {
      if (typeof File !== "undefined" && navigator.canShare && navigator.share) {
        const blob = await makePdf();
        const file = new File([blob], `Farmer-Statement-${report.period.from}-${report.period.to}.pdf`, { type: "application/pdf" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "Farmer Account Statement", text });
          return;
        }
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
    await download();
    const message = "The PDF was downloaded. Please attach it from Downloads/Files to this WhatsApp chat.";
    const cleanPhone = report.farmer.phone ? report.farmer.phone.replace(/\D/g, "") : "";
    const phone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  async function printStatement() {
    try {
      const doc = await buildFarmerStatementPdf(report, config);
      doc.autoPrint();
      const blobUrl = doc.output("bloburl");
      const printWindow = window.open(blobUrl, "_blank");
      if (!printWindow || printWindow.closed || typeof printWindow.closed === "undefined") {
        document.body.classList.add("printing-statement");
        window.print();
        setTimeout(() => document.body.classList.remove("printing-statement"), 1500);
      }
    } catch {
      document.body.classList.add("printing-statement");
      window.print();
      setTimeout(() => document.body.classList.remove("printing-statement"), 1500);
    }
  }

  const isSethOwes = report.balancePosition === "seth_owes_farmer";
  const isFarmerOwes = report.balancePosition === "farmer_owes_seth";
  const isNoDue = report.balancePosition === "no_net_jama_due";
  const positionTitle = isSethOwes
    ? "Seth owes the farmer"
    : isFarmerOwes
    ? "Farmer owes the Seth"
    : isNoDue
    ? "No net Jama due"
    : "Jama position unavailable";

  return (
    <div id="printable-farmer-statement" className="space-y-4 font-sans text-slate-800">
      {/* Masthead Banner */}
      <header className="bg-[#0F172A] text-white rounded-xl p-4 border-b-4 border-[#F59E0B] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md print-avoid-break">
        <div>
          <div className="text-xl font-extrabold tracking-tight text-white leading-tight">
            Saaf <span className="text-[#F59E0B]">Hisaab</span>
          </div>
          <div className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold mt-0.5">
            {t("Farmer Account Statement")}
          </div>
        </div>
        <div className="text-left sm:text-right text-xs text-slate-200">
          <span className="inline-block bg-[#F59E0B]/20 border border-[#F59E0B] text-[#FDE68A] px-3 py-1 rounded-full text-xs font-bold mb-1">
            {t("Period")}: {report.period.from} – {report.period.to}
          </span>
          <div className="text-[11px] text-slate-300">
            {t("Generated")}: {dateText(report.generatedAt)}
          </div>
        </div>
      </header>

      {/* Farmer Particulars & Current Net Standing Hero Card */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 print-avoid-break">
        <div className="bg-slate-50 border border-slate-200 border-l-4 border-l-[#0F172A] rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">
            {t("Farmer Particulars")}
          </p>
          <p className="text-lg font-black text-slate-900 leading-snug">
            {report.farmer.name}
          </p>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            {[report.farmer.phone ? `${t("Phone")}: ${report.farmer.phone}` : null, report.farmer.village ? `${t("Village")}: ${report.farmer.village}` : null, report.farmer.fatherName ? `${t("S/O")}: ${report.farmer.fatherName}` : null].filter(Boolean).join("  |  ")}
          </p>
        </div>

        <div className={`rounded-xl p-3.5 border border-r-4 text-left sm:text-right flex flex-col justify-center shadow-2xs ${
          isSethOwes
            ? "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300 border-r-[#047857] text-emerald-900"
            : isFarmerOwes
            ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300 border-r-[#B45309] text-amber-900"
            : "bg-slate-50 border-slate-200 border-r-slate-500 text-slate-900"
        }`}>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 mb-0.5">
            {t("Current Net Standing")}
          </p>
          <p className="text-2xl font-black text-emerald-950 tracking-tight">
            {report.closingBalance?.jama != null ? inr(Math.abs(report.closingBalance.jama)) : t("Unavailable")}
          </p>
          <p className="text-xs font-bold text-emerald-700 mt-0.5">
            {t(positionTitle)}
          </p>
        </div>
      </section>

      <ReportSummary report={report} />

      {config.deliveryDetail !== "hide" && (
        <section className="overflow-hidden rounded-xl border border-[#A7F3D0] shadow-2xs">
          <div className="bg-[#047857] text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider">
            {t("Crop Delivery Records")}
          </div>
          {config.deliveryDetail === "summary" ? (
            <div className="bg-[#ECFDF5] p-4 text-xs font-medium text-emerald-900 print-avoid-break">
              {report.deliveries.length} {t("deliveries")} · {inr(report.summary.totalNetDeliveryValue)} {t("net delivery value")} · {report.summary.deliveryStatuses?.approved?.count ?? 0} {t("approved")} · {report.summary.deliveryStatuses?.pending?.count ?? 0} {t("pending")} · {report.summary.deliveryStatuses?.held?.count ?? 0} {t("held")}
            </div>
          ) : (
            <div className="bg-white">
              <DeliveryTable rows={deliveries} />
            </div>
          )}
        </section>
      )}

      {config.payments && (
        <section className="overflow-hidden rounded-xl border border-[#BAE6FD] shadow-2xs">
          <div className="bg-[#0369A1] text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider">
            {t("Payments Given")}
          </div>
          <div className="bg-white">
            <PaymentTable rows={report.payments} />
          </div>
        </section>
      )}

      {config.transactions && (
        <section className="overflow-hidden rounded-xl border border-[#DDD6FE] shadow-2xs">
          <div className="bg-[#6D28D9] text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider">
            {t("Other Transactions")}
          </div>
          <div className="bg-white">
            <TransactionTable rows={report.transactions} />
          </div>
        </section>
      )}

      {config.settlements && (
        <section className="overflow-hidden rounded-xl border border-[#99F6E4] shadow-2xs">
          <div className="bg-[#0F766E] text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider">
            {t("Settlements")}
          </div>
          <div className="bg-white">
            <SettlementTable rows={report.settlements} />
          </div>
        </section>
      )}

      {config.interest && (
        <section className="overflow-hidden rounded-xl border border-[#FECDD3] shadow-2xs">
          <div className="bg-[#BE123C] text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider">
            {t("Interest History")}
          </div>
          <div className="bg-white">
            <InterestTable rows={report.interest} />
          </div>
        </section>
      )}

      {/* Dual Signature Block */}
      <div className="pt-6 mt-6 border-t border-slate-200 print-avoid-break">
        <div className="grid grid-cols-2 gap-8 pt-4">
          <div className="border-t border-slate-800 pt-2 text-center">
            <p className="text-xs font-bold text-slate-800">{t("Farmer Signature / Thumb")}</p>
            <p className="text-[10px] text-slate-500">किसान के हस्ताक्षर / अंगूठा</p>
          </div>
          <div className="border-t border-slate-800 pt-2 text-center">
            <p className="text-xs font-bold text-slate-800">{t("Authorized Signatory / Munsi")}</p>
            <p className="text-[10px] text-slate-500">हस्ताक्षर मुनीम / सेठ जी</p>
          </div>
        </div>
        <p className="text-center text-[10px] text-slate-500 mt-4">
          {report.farmer.name} · {report.period.from} to {report.period.to} · Saaf Hisaab Mandi Accounts
        </p>
      </div>

      <div className="no-print sticky bottom-0 grid grid-cols-2 gap-2 border-t border-gray-100 bg-white pb-2 pt-3 sm:grid-cols-5">
        <button onClick={onEdit} className="rounded-xl border border-gray-200 py-3 text-xs font-bold hover:bg-gray-50 transition-colors">{t("Edit selection")}</button>
        <button onClick={onClose} className="rounded-xl border border-gray-200 py-3 text-xs font-bold hover:bg-gray-50 transition-colors">{t("Close")}</button>
        <button onClick={printStatement} className="rounded-xl border border-gray-300 bg-gray-100 py-3 text-xs font-bold text-gray-800 hover:bg-gray-200 transition-colors">{t("Print")}</button>
        <button onClick={download} className="rounded-xl bg-[#184C34] py-3 text-xs font-bold text-white hover:bg-[#123824] shadow-sm transition-colors">{t("Download PDF")}</button>
        <button onClick={share} className="rounded-xl bg-[#25D366] py-3 text-xs font-bold text-white hover:bg-[#20ba5a] shadow-sm transition-colors">{t("Share WhatsApp")}</button>
      </div>
    </div>
  );
}
