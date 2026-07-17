import { Request, Response } from 'express';
import prisma from '../prismaClient';

export const createLead = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.clientId;
    if (!clientId) return res.status(403).json({ message: 'Client ID required' });

    const { name, phoneNumber, email, source, companyName, interestedService, summary, potentialValue } = req.body;

    const lead = await prisma.lead.upsert({
      where: {
        clientId_phoneNumber: {
          clientId,
          phoneNumber
        }
      },
      update: {
        name,
        email,
        companyName,
        interestedService,
        summary,
        potentialValue,
        source
      },
      create: {
        clientId,
        name,
        phoneNumber,
        email,
        companyName,
        interestedService,
        summary,
        potentialValue,
        source
      }
    } as any);

    res.status(201).json(lead);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getLeads = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.clientId;
    if (!clientId) return res.status(403).json({ message: 'Client ID required' });

    const leads = await prisma.lead.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(leads);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateLead = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.clientId;
    const id = req.params.id as string;
    const updates = req.body;

    const lead = await prisma.lead.updateMany({
      where: { id, clientId },
      data: updates
    });

    if (lead.count === 0) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json({ message: 'Lead updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteLead = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.clientId;
    const id = req.params.id as string;

    const lead = await prisma.lead.deleteMany({
      where: { id, clientId }
    });

    if (lead.count === 0) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json({ message: 'Lead deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const toggleLeadBot = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.clientId;
    const id = req.params.id as string;
    const { botEnabled } = req.body;

    const lead = await prisma.lead.updateMany({
      where: { id, clientId },
      data: { botEnabled }
    });

    if (lead.count === 0) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json({ message: `Bot ${botEnabled ? 'enabled' : 'disabled'} for lead` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
