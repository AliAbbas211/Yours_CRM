import { Request, Response } from 'express';
import prisma from '../prismaClient';

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { clientId, name, phoneNumber, companyName, products, address, status } = req.body;

    if (!clientId) {
      return res.status(400).json({ message: 'Client ID is required' });
    }

    const order = await prisma.order.create({
      data: {
        clientId,
        name,
        phoneNumber,
        companyName,
        products,
        address,
        status: status || 'PENDING'
      }
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.query;

    let whereClause = {};
    if (clientId) {
      whereClause = { clientId: String(clientId) };
    }

    // NOTE: the original code selected `client.name`, which does not exist
    // on the Client model (it's `ownerName` / `companyName`) — this was
    // silently throwing on every request. Fixed below.
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: { client: { select: { ownerName: true, companyName: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    const orderId = Array.isArray(id) ? id[0] : id;

    const order = await prisma.order.update({
      where: { id: orderId },
      data: updates
    });

    res.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteOrder = async (req: Request, res: Response) => {
  try {

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    const orderId = Array.isArray(id) ? id[0] : id;

    await prisma.order.delete({
      where: { id: orderId }
    });

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
