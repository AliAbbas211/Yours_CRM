import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import prisma from '../prismaClient';
const prismaAny = prisma as any;
import { geocodeAddress } from '../services/geocodingService';

export const createClient = async (req: Request, res: Response) => {
  try {
    const {
      companyName, ownerName, email, phoneNumber, address, password,
      instanceName, evolutionApiUrl, evolutionApiKey, initialKnowledgeBase,
      originLat, originLng, originAddress
    } = req.body;

    if (!email || !password || !companyName || !ownerName || !instanceName) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    let evolutionData: any = null;
    try {
      const evoResponse = await axios.post(
        `${evolutionApiUrl}/instance/create`,
        {
          instanceName: instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        },
        {
          headers: {
            'apikey': evolutionApiKey,
            'Content-Type': 'application/json',
          },
        }
      );
      evolutionData = evoResponse.data;
    } catch (evoError: any) {
      console.error('Evolution API Error:', evoError.response?.data || evoError.message);
    }

    const specificApiKey = evolutionData?.hash?.apikey || evolutionApiKey;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 30);

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          companyName,
          ownerName,
          email,
          phoneNumber,
          address,
          subscriptionStartDate: startDate,
          subscriptionEndDate: endDate,
          subscriptionDays: 30,
          amountCharged: 0,
          paymentStatus: 'UNPAID',
          instanceName,
          instanceId: evolutionData?.instance?.instanceId || null,
          evolutionApiUrl,
          evolutionApiKey: specificApiKey,
          originLat: originLat ? parseFloat(originLat) : undefined,
          originLng: originLng ? parseFloat(originLng) : undefined,
          originAddress: originAddress || undefined,
        } as any
      });

      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'CLIENT',
          clientId: client.id
        }
      });

      // @ts-ignore
      await tx.agentConfig.create({
        data: {
          client: { connect: { id: client.id } },
          instanceName,
          isActive: true,
          status: 'ONLINE',
          disabledBySuperAdmin: false,
          timezone: 'UTC'
        } as any
      });

      if (initialKnowledgeBase && initialKnowledgeBase.trim() !== '') {
        await tx.knowledgeBase.create({
          data: {
            clientId: client.id,
            title: 'Initial Knowledge Base',
            type: 'FAQ',
            content: initialKnowledgeBase,
            category: 'General'
          }
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'CLIENT_CREATED',
          details: `Client ${companyName} and instance ${instanceName} provisioned.`
        }
      });

      return client;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getClients = async (req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      include: {
        _count: {
          select: { leads: true, knowledgeBases: true, products: true }
        },
        // @ts-ignore
        agentConfig: true
      } as any
    });
    res.json(clients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getClientById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: { leads: true, knowledgeBases: true, products: true }
        },
        // @ts-ignore
        agentConfig: true
      } as any
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateClient = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const updates = { ...req.body };

    if (updates.originLat !== undefined) updates.originLat = parseFloat(updates.originLat);
    if (updates.originLng !== undefined) updates.originLng = parseFloat(updates.originLng);

    // These belong to AgentConfig, not Client — strip them out if present
    // so `prisma.client.update` doesn't throw on unknown fields.
    delete updates.agentConfig;

    const client = await prisma.client.update({
      where: { id },
      data: updates
    });

    res.json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteClient = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    await prisma.knowledgeBase.deleteMany({ where: { clientId: id } });
    await prismaAny.product.deleteMany({ where: { clientId: id } });
    await prisma.user.deleteMany({ where: { clientId: id } });

    const client = await prisma.client.delete({
      where: { id }
    });

    res.json({ message: 'Client deleted', id: client.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getClientSettings = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.clientId;
    if (!clientId) return res.status(403).json({ message: 'Client ID required' });

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      // @ts-ignore
      include: { agentConfig: true }
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateClientSettings = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.clientId;
    if (!clientId) return res.status(403).json({ message: 'Client ID required' });

    const {
      companyName, ownerName, phoneNumber, address, defaultAiModel, defaultPrompt,
      isActive, scheduleEnabled, scheduleStartTime, scheduleEndTime, timezone,
      originLat, originLng, originAddress
    } = req.body;

    // --- SUPER ADMIN KILL SWITCH GUARD ---
    // If the super admin has disabled this client's bot, the client cannot
    // flip isActive back to true from their own portal. Any other setting
    // (company profile, KB, schedule times) can still be changed freely —
    // only re-ENABLING the bot itself is blocked.
    if (isActive === true) {
      const currentConfig = await prisma.agentConfig.findUnique({ where: { id: clientId } as any });
      if ((currentConfig as any)?.disabledBySuperAdmin) {
        return res.status(403).json({
          message: 'Your AI agent has been disabled by the administrator and cannot be re-enabled from here. Please contact support.'
        });
      }
    }

    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: {
        companyName,
        ownerName,
        phoneNumber,
        address,
        defaultAiModel,
        defaultPrompt,
        originLat: originLat !== undefined ? parseFloat(originLat) : undefined,
        originLng: originLng !== undefined ? parseFloat(originLng) : undefined,
        originAddress: originAddress !== undefined ? originAddress : undefined,
      } as any
    });

    // @ts-ignore
    const updatedAgentConfig = await prisma.agentConfig.upsert({
      where: { id: clientId },
      update: {
        isActive: isActive !== undefined ? isActive : undefined,
        scheduleEnabled: scheduleEnabled !== undefined ? scheduleEnabled : undefined,
        scheduleStartTime,
        scheduleEndTime,
        timezone
      },
      create: {
        client: { connect: { id: clientId } },
        isActive: isActive !== undefined ? isActive : true,
        scheduleEnabled: scheduleEnabled !== undefined ? scheduleEnabled : false,
        scheduleStartTime,
        scheduleEndTime,
        timezone: timezone || "UTC"
      }
    });

    res.json({ ...updatedClient, agentConfig: updatedAgentConfig });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getClientDashboardStats = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.clientId;
    if (!clientId) return res.status(403).json({ message: 'Client ID required' });

    const totalLeads = await prisma.lead.count({ where: { clientId } });
    const newLeads = await prisma.lead.count({ where: { clientId, status: 'NEW' } });
    const totalKbDocs = await prisma.knowledgeBase.count({ where: { clientId } });
    const totalProducts = await prismaAny.product.count({ where: { clientId } });
    const totalOrders = await prismaAny.order.count({ where: { clientId } });

    const recentLeads = await prisma.lead.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // @ts-ignore
    const agentConfig = await prisma.agentConfig.findUnique({
      where: { id: clientId }
    });

    res.json({
      totalLeads,
      newLeads,
      totalKbDocs,
      totalProducts,
      totalOrders,
      recentLeads,
      botStatus: agentConfig ? agentConfig.status : 'OFFLINE',
      botActive: agentConfig ? agentConfig.isActive : false,
      disabledBySuperAdmin: (agentConfig as any)?.disabledBySuperAdmin || false,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Auto-detects lat/lng for the client's business address using Google
 * Geocoding, and saves it as the origin point used for delivery-distance
 * calculations on every order. Call this from the Settings page whenever
 * the client sets/changes their address.
 */
export const geocodeOriginAddress = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.clientId;
    if (!clientId) return res.status(403).json({ message: 'Client ID required' });

    const { address } = req.body;
    if (!address || !address.trim()) {
      return res.status(400).json({ message: 'address is required' });
    }

    const point = await geocodeAddress(address);
    if (!point) {
      return res.status(422).json({
        message: 'Could not geocode this address. Check GOOGLE_MAPS_API_KEY is configured, or enter coordinates manually.'
      });
    }

    const client = await prisma.client.update({
      where: { id: clientId },
      data: { originLat: point.lat, originLng: point.lng, originAddress: address } as any
    });

    res.json({ originLat: point.lat, originLng: point.lng, originAddress: address, client });
  } catch (error) {
    console.error('geocodeOriginAddress error:', error);
    res.status(500).json({ message: 'Server error geocoding address' });
  }
};
