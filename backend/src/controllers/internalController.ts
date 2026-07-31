import { Request, Response } from 'express';
import prisma from '../prismaClient';
import axios from 'axios';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'change-me';

export const getClientByInstance = async (req: Request, res: Response) => {
  if (req.headers['x-internal-key'] !== process.env.N8N_INTERNAL_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const client = await prisma.client.findFirst({
      where: { instanceName: req.params.instanceName },
      select: {
        id: true,
        evolutionApiUrl: true,
        evolutionApiKey: true,
        instanceName: true,
        companyProfileDocUrl: true,
        companyProfileVideoUrl: true,
        companyName: true,
      },
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const upsertLead = async (req: Request, res: Response) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== INTERNAL_API_KEY) return res.status(401).json({ error: 'Invalid API key' });

  const { clientId, name, phoneNumber, email, source, companyName, interestedService, summary, potentialValue } = req.body;

  try {
    const lead = await prisma.lead.upsert({
      where: { clientId_phoneNumber: { clientId, phoneNumber } },
      update: { name, email, companyName, interestedService, summary, potentialValue, source },
      create: { clientId, name, phoneNumber, email, companyName, interestedService, summary, potentialValue, source },
    });
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upsert lead' });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  const apiKey = req.headers['x-api-key'];
  if
