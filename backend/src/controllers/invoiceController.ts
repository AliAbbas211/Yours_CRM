import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import prisma from '../prismaClient';
import { resolveDeliveryForAddress } from '../services/geocodingService';

const invoiceDir = path.join(__dirname, '../../uploads/invoices');
if (!fs.existsSync(invoiceDir)) fs.mkdirSync(invoiceDir, { recursive: true });

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function threeDigitsToWords(n: number): string {
  let result = '';
  if (n >= 100) {
    result += ONES[Math.floor(n / 100)] + ' Hundred';
    n %= 100;
    if (n > 0) result += ' ';
  }
  if (n >= 20) {
    result += TENS[Math.floor(n / 10)];
    if (n % 10 > 0) result += '-' + ONES[n % 10];
  } else if (n > 0) {
    result += ONES[n];
  }
  return result;
}

/**
 * Converts a rupee amount into English words, e.g. 50000 -> "Fifty Thousand PKR".
 * Rounds to the nearest whole rupee — paisa amounts aren't used in this business.
 */
export function numberToWordsPKR(amount: number, currencyCode: string = 'PKR'): string {
  let n = Math.round(Math.abs(amount));
  if (n === 0) return `Zero ${currencyCode}`;

  const parts: string[] = [];
  const million = Math.floor(n / 1000000);
  n %= 1000000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const rest = n;

  if (million > 0) parts.push(threeDigitsToWords(million) + ' Million');
  if (thousand > 0) parts.push(threeDigitsToWords(thousand) + ' Thousand');
  if (rest > 0) parts.push(threeDigitsToWords(rest));

  return parts.join(' ') + ' ' + currencyCode;
}

/**
 * Called by n8n right after "Save Order to CRM". Renders a real PDF invoice,
 * saves it to disk, and returns a public URL that Evolution API can fetch
 * directly to send as a WhatsApp document.
 *
 * Body: { orderId, customerName, product, address, phone, subtotal,
 *         quantity?, unitPrice?, discount?, requiresDelivery }
 *
 * requiresDelivery (boolean) — set by the AI per order type. Only when true
 * do we attempt a delivery-charge calculation at all; for service/digital
 * orders (Company Profile, software, etc.) delivery charge is skipped
 * entirely instead of falling back to a flat charge.
 */
export const generateInvoice = async (req: Request, res: Response) => {
  try {
    const {
      orderId,
      customerName,
      product,
      address,
      phone,
      subtotal: subtotalOverride,
      quantity,
      unitPrice,
      discount: discountOverride,
      requiresDelivery,
    } = req.body;

    if (!orderId) return res.status(400).json({ message: 'orderId is required' });

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { client: true } });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const CURRENCY_SYMBOLS: Record<string, string> = {
      PKR: 'Rs', USD: '$', GBP: '£', EUR: '€', AED: 'AED', SAR: 'SAR', INR: '₹', CAD: 'C$', AUD: 'A$'
    };
    const currencyCode = (order.client as any).currency || 'PKR';
    const currencySymbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;

    const deliveryAddress = address || order.address;
    const needsDelivery = requiresDelivery === true || requiresDelivery === 'true';

    let distanceKm: number | null = null;
    let deliveryCharge = 0;
    let deliveryPoint: { lat: number; lng: number } | null = null;

    if (needsDelivery) {
      const origin =
        (order.client as any).originLat != null && (order.client as any).originLng != null
          ? { lat: (order.client as any).originLat, lng: (order.client as any).originLng }
          : null;
      const result = await resolveDeliveryForAddress(origin, deliveryAddress);
      distanceKm = result.distanceKm;
      deliveryCharge = result.deliveryCharge;
      deliveryPoint = result.deliveryPoint;
    }

    const subtotal = subtotalOverride !== undefined ? parseFloat(subtotalOverride) : 0;
    const discount = discountOverride !== undefined ? parseFloat(discountOverride) : 0;
    const qty = quantity !== undefined && quantity !== null && quantity !== '' ? parseFloat(quantity) : null;
    const rate = unitPrice !== undefined && unitPrice !== null && unitPrice !== '' ? parseFloat(unitPrice) : null;
    const total = subtotal + deliveryCharge - discount;

    const invoiceNumber = `INV-${order.id.slice(-6).toUpperCase()}-${Date.now().toString().slice(-5)}`;
    const fileName = `${invoiceNumber}.pdf`;
    const filePath = path.join(invoiceDir, fileName);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const NAVY = '#0a1142';
    const GREY = '#666';
    const LIGHT = '#ddd';

    // ---- Header ----
    doc.fontSize(20).font('Helvetica-Bold').fillColor(NAVY).text(order.client.companyName);
    doc.fontSize(9).font('Helvetica').fillColor(GREY);
    if (order.client.address) doc.text(order.client.address);
    if (order.client.phoneNumber) doc.text(order.client.phoneNumber);
    doc.moveDown(1.5);

    doc.fontSize(18).font('Helvetica-Bold').fillColor('#000').text('INVOICE', 400, doc.y - 55, { align: 'right' });
    doc.fontSize(9).font('Helvetica').fillColor(GREY);
    doc.text(`Invoice #: ${invoiceNumber}`, { align: 'right' });
    doc.text(`Invoice Date: ${new Date().toLocaleDateString('en-GB')}`, { align: 'right' });
    doc.text(`Order ID: ${order.id}`, { align: 'right' });
    doc.text('Sale Agent: Yourstechhub AI Assistant', { align: 'right' });
    doc.moveDown(2);

    // ---- Bill To ----
    doc.fillColor(NAVY).fontSize(11).font('Helvetica-Bold').text('Bill To');
    doc.fillColor('#333').font('Helvetica').fontSize(10);
    doc.text(customerName || order.name);
    if (deliveryAddress) doc.text(deliveryAddress);
    if (phone || order.phoneNumber) doc.text(phone || order.phoneNumber);
    doc.moveDown(1.5);

    // ---- Line items table ----
    const tableTop = doc.y;
    doc.rect(50, tableTop, 495, 22).fill(NAVY);
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(9);
    doc.text('Item', 58, tableTop + 7, { width: 200 });
    doc.text('Qty', 268, tableTop + 7, { width: 40, align: 'right' });
    doc.text('Rate', 318, tableTop + 7, { width: 80, align: 'right' });
    doc.text('Amount', 460, tableTop + 7, { width: 85, align: 'right' });

    let y = tableTop + 32;
    doc.font('Helvetica').fontSize(10).fillColor('#333');
    const itemName = product || order.products;
    const itemHeight = doc.heightOfString(itemName, { width: 200 });
    doc.text(itemName, 58, y, { width: 200 });
    if (qty !== null) doc.text(String(qty), 268, y, { width: 40, align: 'right' });
    if (rate !== null) doc.text(`${currencySymbol} ${rate.toFixed(2)}`, 318, y, { width: 80, align: 'right' });
    doc.text(`${currencySymbol} ${subtotal.toFixed(2)}`, 460, y, { width: 85, align: 'right' });
    y += Math.max(itemHeight, 14) + 8;

    if (deliveryCharge > 0) {
      doc.text('Delivery Charge', 58, y);
      doc.text(`${currencySymbol} ${deliveryCharge.toFixed(2)}`, 460, y, { width: 85, align: 'right' });
      y += 14;
      if (distanceKm !== null) {
        doc.fontSize(8).fillColor('#999').text(`Distance: ${distanceKm.toFixed(1)} km from store`, 58, y);
        doc.fontSize(10).fillColor('#333');
        y += 14;
      }
      y += 8;
    }

    doc.moveTo(50, y).lineTo(545, y).strokeColor(LIGHT).stroke();
    y += 12;

    doc.font('Helvetica').fontSize(10).fillColor('#333');
    doc.text('Sub Total', 318, y, { width: 80, align: 'right' });
    doc.text(`${currencySymbol} ${(subtotal + deliveryCharge).toFixed(2)}`, 460, y, { width: 85, align: 'right' });
    y += 18;

    if (discount > 0) {
      doc.fillColor('#c0392b');
      doc.text('Discount', 318, y, { width: 80, align: 'right' });
      doc.text(`-${currencySymbol} ${discount.toFixed(2)}`, 460, y, { width: 85, align: 'right' });
      doc.fillColor('#333');
      y += 18;
    }

    doc.moveTo(318, y).lineTo(545, y).strokeColor(LIGHT).stroke();
    y += 10;

    doc.font('Helvetica-Bold').fontSize(12).fillColor(NAVY);
    doc.text('Total', 318, y, { width: 80, align: 'right' });
    doc.text(`${currencySymbol} ${total.toFixed(2)}`, 460, y, { width: 85, align: 'right' });
    y += 20;

    doc.fontSize(10);
    doc.text('Amount Due', 318, y, { width: 80, align: 'right' });
    doc.text(`${currencySymbol} ${total.toFixed(2)}`, 460, y, { width: 85, align: 'right' });
    y += 26;

    doc.font('Helvetica-Oblique').fontSize(9).fillColor(GREY);
    doc.text(`With words: ${numberToWordsPKR(total, currencyCode)}`, 50, y);
    y = doc.y + 20;

    // ---- Payment details ----
    doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('Online Payment Details', 50, y);
    y = doc.y + 6;
    doc.font('Helvetica').fontSize(9).fillColor('#333');
    doc.text('Account Title: YOURSTECHHUB', 50, y); y += 14;
    doc.text('Bank Name: UBL', 50, y); y += 14;
    doc.text('Account Number: 0993331542413', 50, y); y += 14;
    doc.text('IBAN: PK06UNIL0109000331542413', 50, y); y += 26;

    doc.font('Helvetica').fontSize(9).fillColor('#999').text('Thank you for your order!', 50, y, { align: 'center', width: 495 });

    // ---- Page 2: Terms & Conditions ----
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(13).fillColor(NAVY).text('Terms & Conditions:');
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(9).fillColor('#333').text(
      'Refunds will only be issued for defective products/services or as per the written agreement. Prices are exclusive of taxes, which will be added where applicable. Ownership of goods/services remains with the company until full payment is received. Both parties agree to maintain confidentiality regarding any sensitive information shared.',
      { width: 495 }
    );
    doc.moveDown(3);
    doc.text('Authorized Signature _________________________');

    doc.end();

    await new Promise<void>((resolve, reject) => {
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });

    const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:5000';
    const invoiceUrl = `${baseUrl}/uploads/invoices/${fileName}`;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        invoiceUrl,
        invoiceNumber,
        subtotal,
        deliveryCharge,
        distanceKm: distanceKm ?? undefined,
        total,
        deliveryLat: deliveryPoint?.lat,
        deliveryLng: deliveryPoint?.lng,
      } as any,
    });

    res.json({ success: true, invoiceUrl, invoiceNumber, subtotal, deliveryCharge, distanceKm, total });
  } catch (error) {
    console.error('generateInvoice error:', error);
    res.status(500).json({ message: 'Server error generating invoice' });
  }
};

export const getInvoiceForOrder = async (req: Request, res: Response) => {
  try {
    const orderIdParam = req.params.orderId;
    const orderId = Array.isArray(orderIdParam) ? orderIdParam[0] : orderIdParam;
    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' });
    }
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || !(order as any).invoiceUrl) {
      return res.status(404).json({ message: 'No invoice generated for this order yet' });
    }
    res.json({
      invoiceUrl: (order as any).invoiceUrl,
      invoiceNumber: (order as any).invoiceNumber,
      total: (order as any).total,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
