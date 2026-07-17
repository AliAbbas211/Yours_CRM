import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import prisma from '../prismaClient';
import { resolveDeliveryForAddress } from '../services/geocodingService';

const invoiceDir = path.join(__dirname, '../../uploads/invoices');
if (!fs.existsSync(invoiceDir)) fs.mkdirSync(invoiceDir, { recursive: true });

/**
 * Called by n8n right after "Save Order to CRM". Computes delivery charge
 * (using the client's origin point + geocoded customer address), renders
 * a real PDF invoice, saves it to disk, and returns a public URL that
 * Evolution API can fetch directly to send as a WhatsApp document.
 *
 * Body: { orderId, customerName, product, address, phone }
 * (amount/subtotal are derived server-side from the order + delivery calc
 * so the AI never has to compute money math itself)
 */
export const generateInvoice = async (req: Request, res: Response) => {
  try {
    const { orderId, customerName, product, address, phone, subtotal: subtotalOverride } = req.body;

    if (!orderId) return res.status(400).json({ message: 'orderId is required' });

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { client: true } });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const origin =
      (order.client as any).originLat != null && (order.client as any).originLng != null
        ? { lat: (order.client as any).originLat, lng: (order.client as any).originLng }
        : null;

    const deliveryAddress = address || order.address;
    const { distanceKm, deliveryCharge, deliveryPoint } = await resolveDeliveryForAddress(origin, deliveryAddress);

    // subtotal: prefer an explicit value passed in (e.g. computed from a
    // product's price in your Product catalog), otherwise 0 — the invoice
    // will still render correctly and show delivery charge itemized.
    const subtotal = subtotalOverride !== undefined ? parseFloat(subtotalOverride) : 0;
    const total = subtotal + deliveryCharge;

    const invoiceNumber = `INV-${order.id.slice(-6).toUpperCase()}-${Date.now().toString().slice(-5)}`;
    const fileName = `${invoiceNumber}.pdf`;
    const filePath = path.join(invoiceDir, fileName);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // ---- Header ----
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#0a1142').text(order.client.companyName);
    doc.fontSize(9).font('Helvetica').fillColor('#666');
    if (order.client.address) doc.text(order.client.address);
    if (order.client.phoneNumber) doc.text(order.client.phoneNumber);
    doc.moveDown(1.5);

    doc.fontSize(18).font('Helvetica-Bold').fillColor('#000').text('INVOICE', 400, doc.y - 55, { align: 'right' });
    doc.fontSize(9).font('Helvetica').fillColor('#666');
    doc.text(`Invoice #: ${invoiceNumber}`, { align: 'right' });
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, { align: 'right' });
    doc.text(`Order ID: ${order.id}`, { align: 'right' });
    doc.moveDown(2);

    // ---- Bill To ----
    doc.fillColor('#0a1142').fontSize(11).font('Helvetica-Bold').text('Bill To');
    doc.fillColor('#333').font('Helvetica').fontSize(10);
    doc.text(customerName || order.name);
    doc.text(deliveryAddress);
    if (phone || order.phoneNumber) doc.text(phone || order.phoneNumber);
    doc.moveDown(1.5);

    // ---- Line items table ----
    const tableTop = doc.y;
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0a1142');
    doc.text('Description', 50, tableTop);
    doc.text('Amount', 460, tableTop, { width: 85, align: 'right' });
    doc.moveTo(50, tableTop + 16).lineTo(545, tableTop + 16).strokeColor('#ddd').stroke();

    let y = tableTop + 26;
    doc.font('Helvetica').fontSize(10).fillColor('#333');
    doc.text(product || order.products, 50, y, { width: 390 });
    doc.text(subtotal.toFixed(2), 460, y, { width: 85, align: 'right' });

    y += 24;
    doc.text('Delivery Charge', 50, y);
    doc.text(deliveryCharge.toFixed(2), 460, y, { width: 85, align: 'right' });

    if (distanceKm !== null) {
      y += 16;
      doc.fontSize(8).fillColor('#999').text(`Distance: ${distanceKm.toFixed(1)} km from store`, 50, y);
      doc.fontSize(10).fillColor('#333');
    }

    y += 26;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').stroke();
    y += 12;

    doc.font('Helvetica-Bold').fontSize(13).fillColor('#0a1142');
    doc.text('Total', 50, y);
    doc.text(total.toFixed(2), 460, y, { width: 85, align: 'right' });

    doc.moveDown(4);
    doc.font('Helvetica').fontSize(9).fillColor('#999').text('Thank you for your order!', 50, doc.y, { align: 'center', width: 495 });

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
