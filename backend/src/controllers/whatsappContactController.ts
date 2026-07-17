import { Request, Response } from 'express';
import axios from 'axios';
import prisma from '../prismaClient';

const resolveClientId = (req: Request): string | null => {
  const user = (req as any).user;
  if (user?.role === 'CLIENT') return user.clientId;
  return req.params.clientId || (req.query.clientId as string) || req.body.clientId || null;
};

const whitelistModel: any = (prisma as any).whitelistContact ?? (prisma as any).whitelistContacts;

/**
 * Fetches ALL contacts from the Evolution API instance (this is what powers
 * "scan QR then show all contacts" in the portal — call this right after
 * the instance shows status ONLINE).
 */
export const getContacts = async (req: Request, res: Response) => {
  try {
    const clientId = resolveClientId(req);
    if (!clientId) return res.status(403).json({ message: 'Client ID required' });

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client || !client.instanceName || !client.evolutionApiUrl || !client.evolutionApiKey) {
      return res.status(404).json({ message: 'Evolution API is not configured for this client yet' });
    }

    let contactsRaw: any[] = [];
    try {
      const evoRes = await axios.post(
        `${client.evolutionApiUrl}/chat/findContacts/${client.instanceName}`,
        {},
        { headers: { apikey: client.evolutionApiKey }, timeout: 15000 }
      );
      contactsRaw = Array.isArray(evoRes.data) ? evoRes.data : evoRes.data?.contacts || [];
    } catch (evoErr: any) {
      console.error('Evolution findContacts error:', evoErr.response?.data || evoErr.message);
      return res.status(502).json({ message: 'Failed to fetch contacts from Evolution API. Is the instance connected?' });
    }

    const contacts = contactsRaw
      .filter((c: any) => {
        const jid = c.id || c.remoteJid;
        // Filter out groups and broadcast lists — we only whitelist 1:1 chats
        return jid && !jid.endsWith('@g.us') && jid !== 'status@broadcast';
      })
      .map((c: any) => ({
        remoteJid: c.id || c.remoteJid,
        name: c.pushName || c.name || c.notify || (c.id || c.remoteJid).split('@')[0],
        profilePicUrl: c.profilePictureUrl || c.profilePicUrl || null,
      }));

    const whitelisted = await whitelistModel.findMany({ where: { clientId } });
    const whitelistMap = new Map<string, { isWhitelisted: boolean }>(
      whitelisted.map((w) => [w.remoteJid, { isWhitelisted: w.isWhitelisted }])
    );

    const merged = contacts.map((c) => {
      const w = whitelistMap.get(c.remoteJid);
      return {
        ...c,
        isWhitelisted: w?.isWhitelisted ?? false,
      };
    });

    res.json(merged);
  } catch (error) {
    console.error('getContacts error:', error);
    res.status(500).json({ message: 'Server error fetching contacts' });
  }
};

export const getWhitelist = async (req: Request, res: Response) => {
  try {
    const clientId = resolveClientId(req);
    if (!clientId) return res.status(403).json({ message: 'Client ID required' });

    const list = await whitelistModel.findMany({
      where: { clientId },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(list);
  } catch (error) {
    console.error('getWhitelist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const toggleWhitelist = async (req: Request, res: Response) => {
  try {
    const clientId = resolveClientId(req);
    if (!clientId) return res.status(403).json({ message: 'Client ID required' });

    const { remoteJid, name, profilePicUrl, isWhitelisted } = req.body;
    if (!remoteJid) return res.status(400).json({ message: 'remoteJid is required' });

    const record = await whitelistModel.upsert({
      where: { clientId_remoteJid: { clientId, remoteJid } },
      update: {
        isWhitelisted: isWhitelisted !== undefined ? !!isWhitelisted : true,
        name: name ?? undefined,
        profilePicUrl: profilePicUrl ?? undefined,
      },
      create: {
        clientId,
        remoteJid,
        name: name || null,
        profilePicUrl: profilePicUrl || null,
        isWhitelisted: isWhitelisted !== undefined ? !!isWhitelisted : true,
      },
    });

    res.json(record);
  } catch (error) {
    console.error('toggleWhitelist error:', error);
    res.status(500).json({ message: 'Server error updating whitelist' });
  }
};

export const bulkWhitelist = async (req: Request, res: Response) => {
  try {
    const clientId = resolveClientId(req);
    if (!clientId) return res.status(403).json({ message: 'Client ID required' });

    const { contacts } = req.body as { contacts: { remoteJid: string; name?: string; isWhitelisted: boolean }[] };
    if (!Array.isArray(contacts)) return res.status(400).json({ message: 'contacts array is required' });

    const results = await Promise.all(
      contacts.map((c) =>
        whitelistModel.upsert({
          where: { clientId_remoteJid: { clientId, remoteJid: c.remoteJid } },
          update: { isWhitelisted: c.isWhitelisted, name: c.name ?? undefined },
          create: { clientId, remoteJid: c.remoteJid, name: c.name || null, isWhitelisted: c.isWhitelisted },
        })
      )
    );

    res.json({ updated: results.length, results });
  } catch (error) {
    console.error('bulkWhitelist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * PUBLIC (internal, n8n-facing) endpoint — the dynamic replacement for the
 * hardcoded whitelist array in the old workflow.
 * GET /api/bot/check-whitelist?instance=xxx&remoteJid=xxx
 */
export const checkWhitelistForBot = async (req: Request, res: Response) => {
  try {
    const { instance, remoteJid } = req.query as { instance: string; remoteJid: string };
    if (!instance || !remoteJid) return res.status(400).json({ allowed: false, reason: 'missing_params' });

    const client = await prisma.client.findFirst({ where: { instanceName: instance } });
    if (!client) return res.json({ allowed: false, reason: 'client_not_found' });

    if (client.status !== 'ACTIVE') {
      return res.json({ allowed: false, reason: 'client_inactive' });
    }

    const entry = await whitelistModel.findUnique({
      where: { clientId_remoteJid: { clientId: client.id, remoteJid } },
    });

    res.json({
      allowed: !!entry?.isWhitelisted,
      reason: entry?.isWhitelisted ? 'ok' : 'not_whitelisted',
      clientId: client.id,
    });
  } catch (error) {
    console.error('checkWhitelistForBot error:', error);
    res.status(500).json({ allowed: false, reason: 'server_error' });
  }
};
