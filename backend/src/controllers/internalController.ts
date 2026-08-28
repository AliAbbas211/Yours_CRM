import { Request, Response } from 'express';
import prisma from '../prismaClient';
import axios from 'axios';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'change-me';

export const upsertLead = async (req: Request, res: Response) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== INTERNAL_API_KEY) return res.status(401).json({ error: 'Invalid API key' });

  const { clientId, name, phoneNumber, email, source, companyName, interestedService, summary, potentialValue, avatarUrl } = req.body;

  if (!clientId || !phoneNumber) {
    return res.status(400).json({ error: 'clientId and phoneNumber are required' });
  }

  try {
    const existing = await prisma.lead.findUnique({ where: { clientId_phoneNumber: { clientId, phoneNumber } } });

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (companyName !== undefined) updateData.companyName = companyName;
    if (interestedService !== undefined) updateData.interestedService = interestedService;
    if (summary !== undefined) updateData.summary = summary;
    if (potentialValue !== undefined) updateData.potentialValue = potentialValue;
    if (source !== undefined) updateData.source = source;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    const lead = await prisma.lead.upsert({
      where: { clientId_phoneNumber: { clientId, phoneNumber } },
      update: updateData,
      create: {
        clientId,
        phoneNumber,
        name: name || existing?.name || 'WhatsApp User',
        email,
        companyName,
        interestedService,
        summary,
        potentialValue,
        source,
        avatarUrl,
      },
    });
    res.json(lead);
  } catch (error) {
    console.error('upsertLead error:', error);
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

export const createMessage = async (req: Request, res: Response) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== INTERNAL_API_KEY) return res.status(401).json({ error: 'Invalid API key' });

  const leadIdParam = req.params.leadId;
  const leadId = Array.isArray(leadIdParam) ? leadIdParam[0] : leadIdParam;
  const { sender, content } = req.body;

  if (!leadId || !content || !sender) {
    return res.status(400).json({ error: 'leadId, sender, and content are required' });
  }

  try {
    const message = await prisma.message.create({
      data: { leadId, sender, content },
    });
    await prisma.lead.update({
      where: { id: leadId },
      data: { lastInteraction: new Date() },
    });
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save message' });
  }
};

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
        companyName: true,
      },
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};


export const getLeadsNeedingSummary = async (req: Request, res: Response) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== INTERNAL_API_KEY) return res.status(401).json({ error: 'Invalid API key' });

  try {
    const candidates = await prisma.lead.findMany({
      where: {
        messages: { some: {} }
      } as any,
      select: {
        id: true,
        clientId: true,
        name: true,
        phoneNumber: true,
        lastInteraction: true,
        // @ts-ignore
        lastSummarizedAt: true,
      } as any,
    });

    const needsSummary = (candidates as any[]).filter((l) => {
      if (!l.lastSummarizedAt) return true;
      if (!l.lastInteraction) return false;
      return new Date(l.lastInteraction).getTime() > new Date(l.lastSummarizedAt).getTime();
    });

    res.json(needsSummary);
  } catch (error) {
    console.error('getLeadsNeedingSummary error:', error);
    res.status(500).json({ error: 'Failed to fetch leads needing summary' });
  }
};

export const saveLeadSummary = async (req: Request, res: Response) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== INTERNAL_API_KEY) return res.status(401).json({ error: 'Invalid API key' });

  const leadIdParam = req.params.leadId;
  const leadId = Array.isArray(leadIdParam) ? leadIdParam[0] : leadIdParam;
  const { summary, conversionLikelihood, nextFollowUpSuggestion } = req.body;

  if (!leadId) return res.status(400).json({ error: 'Invalid leadId' });

  try {
    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        summary: summary !== undefined ? summary : undefined,
        conversionLikelihood: conversionLikelihood !== undefined ? conversionLikelihood : undefined,
        nextFollowUpSuggestion: nextFollowUpSuggestion !== undefined ? nextFollowUpSuggestion : undefined,
        lastSummarizedAt: new Date(),
      } as any,
    });
    res.json(lead);
  } catch (error) {
    console.error('saveLeadSummary error:', error);
    res.status(500).json({ error: 'Failed to save lead summary' });
  }
};
