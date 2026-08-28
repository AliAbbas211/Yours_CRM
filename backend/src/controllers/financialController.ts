import { Request, Response } from 'express';
import prisma from '../prismaClient';
const prismaAny = prisma as any;

export const getFinancials = async (req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        companyName: true,
        currency: true,
        monthlyRate: true,
        installationCharge: true,
        paymentStatus: true,
        subscriptionEndDate: true,
        amountCharged: true
      } as any
    });

    const payments = await prismaAny.subscriptionPayment.findMany({
      orderBy: { paidAt: 'desc' },
      include: { client: { select: { companyName: true, currency: true } } }
    });

    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { companyName: true } }
      }
    });

    // Group total collected (from the payment ledger, the real source of
    // truth for money received) by each client's OWN currency — never sum
    // across different currencies into one misleading combined number.
    const totalsByCurrency: Record<string, number> = {};
    const collectedByClient: Record<string, number> = {};

    for (const p of payments as any[]) {
      const code = p.client?.currency || 'PKR';
      totalsByCurrency[code] = (totalsByCurrency[code] || 0) + p.amount;
      collectedByClient[p.clientId] = (collectedByClient[p.clientId] || 0) + p.amount;
    }

    const clientsWithTotals = (clients as any[]).map((c) => ({
      ...c,
      currency: c.currency || 'PKR',
      totalCollected: collectedByClient[c.id] || 0
    }));

    res.json({ clients: clientsWithTotals, invoices, payments, totalsByCurrency });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const processPayment = async (req: Request, res: Response) => {
  try {
    const { clientId, amount, notes } = req.body;

    if (!clientId || !amount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Process payment: add 30 days to subscription
    const newEndDate = new Date(client.subscriptionEndDate || new Date());
    newEndDate.setDate(newEndDate.getDate() + 30);

    const result = await prisma.$transaction(async (tx) => {
      const updatedClient = await tx.client.update({
        where: { id: clientId },
        data: {
          paymentStatus: 'PAID',
          status: 'ACTIVE',
          subscriptionEndDate: newEndDate,
          amountCharged: client.amountCharged + amount
        }
      });

      const invoice = await tx.invoice.create({
        data: {
          clientId,
          invoiceNumber: `INV-${Date.now()}`,
          amount,
          paymentDate: new Date(),
          renewalDate: newEndDate,
          paymentMethod: 'Manual Transfer',
          notes
        }
      });

      return { client: updatedClient, invoice };
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
