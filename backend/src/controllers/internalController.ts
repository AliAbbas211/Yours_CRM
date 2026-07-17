import { Request, Response } from 'express';
import prisma from '../prismaClient';
import axios from 'axios';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'change-me';

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
  if (apiKey !== INTERNAL_API_KEY) return res.status(401).json({ error: 'Invalid API key' });

  const leadIdParam = req.params.leadId;
  const leadId = Array.isArray(leadIdParam) ? leadIdParam[0] : leadIdParam;
  if (!leadId) return res.status(400).json({ error: 'Invalid leadId' });

  const messages = await prisma.message.findMany({
    where: { leadId },
    orderBy: { createdAt: 'asc' },
    select: { sender: true, content: true },
  });
  res.json(messages);
};

export const sendWhatsAppMessage = async (req: Request, res: Response) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== INTERNAL_API_KEY) return res.status(401).json({ error: 'Invalid API key' });

  const { clientId, phoneNumber, text } = req.body;
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || !client.instanceName || !client.evolutionApiUrl || !client.evolutionApiKey) {
    return res.status(404).json({ error: 'Client config missing' });
  }

  const payload = { number: phoneNumber, text, delay: 1000 };
  const url = `${client.evolutionApiUrl}/message/sendText/${client.instanceName}`;
  const response = await axios.post(url, payload, {
    headers: { 'apikey': client.evolutionApiKey, 'Content-Type': 'application/json' },
  });
  res.json({ success: true, data: response.data });
};