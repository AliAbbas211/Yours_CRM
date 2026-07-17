import { Request, Response } from 'express';
import prisma from '../prismaClient';

export const getFinancials = async (req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        companyName: true,
        paymentStatus: true,
        subscriptionEndDate: true,
        amountCharged: true
      }
    });

    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { companyName: true } }
      }
    });

    res.json({ clients, invoices });
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
