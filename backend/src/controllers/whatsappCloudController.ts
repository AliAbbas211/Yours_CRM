import { Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import prisma from '../prismaClient';
import { AuthRequest } from '../middlewares/authMiddleware';
import {
  exchangeCodeForToken,
  getPhoneDetails,
  subscribeApp,
  unsubscribeApp,
  registerPhone,
  syncSmbData,
  sendText,
  sendMedia,
  MediaKind,
  META_APP_SECRET,
} from '../services/whatsappCloud';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'change-me';

// Resolve which client the logged-in user is acting for.
const resolveClientId = (req: AuthRequest): string | null => {
  if (req.user?.role === 'SUPER_ADMIN') return (req.body?.clientId || req.query?.clientId || null) as string | null;
  return req.user?.clientId || null;
};

// POST /api/whatsapp-cloud/connect  { code, wabaId, phoneNumberId }
export const connectCloud = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = resolveClientId(req);
    const { code, wabaId, phoneNumberId, coexistence } = req.body || {};
    if (!clientId) return res.status(400).json({ error: 'No client for this user' });
    if (!code || !wabaId || !phoneNumberId) {
      return res.status(400).json({ error: 'code, wabaId and phoneNumberId are required' });
    }

    const token = await exchangeCodeForToken(String(code));

    // Subscribe our app to the customer's WABA so webhooks (incoming messages) reach us.
    try {
      await subscribeApp(String(wabaId), token);
    } catch (e: any) {
      console.error('subscribeApp failed:', e.response?.data || e.message);
    }

    // Register the number on Cloud API (needed for numbers added through Embedded Signup).
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    try {
      if (coexistence) {
        for (const t of ['smb_app_state_sync', 'history']) {
          try { await syncSmbData(String(phoneNumberId), token, t); } catch (e: any) { console.error('smb sync', t, e.response?.data || e.message); }
        }
      } else {
        await registerPhone(String(phoneNumberId), token, pin);
      }
    } catch (e: any) {
      console.error('registerPhone failed (may already be registered):', e.response?.data || e.message);
    }

    let phone: { display_phone_number?: string; verified_name?: string } = {};
    try {
      phone = await getPhoneDetails(String(phoneNumberId), token);
    } catch (e: any) {
      console.error('getPhoneDetails failed:', e.response?.data || e.message);
    }

    await prisma.client.update({
      where: { id: clientId },
      data: {
        waProvider: 'CLOUD',
        waBusinessAccountId: String(wabaId),
        waPhoneNumberId: String(phoneNumberId),
        waAccessToken: token,
        waPin: coexistence ? null : pin,
        waPhoneDisplay: phone.display_phone_number || null,
        waVerifiedName: phone.verified_name || null,
        waConnectedAt: new Date(),
      },
    });

    res.json({
      success: true,
      phoneDisplay: phone.display_phone_number || null,
      verifiedName: phone.verified_name || null,
    });
  } catch (error: any) {
    console.error('connectCloud error:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || error.message || 'Failed to connect WhatsApp' });
  }
};

// GET /api/whatsapp-cloud/status
export const cloudStatus = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = resolveClientId(req);
    if (!clientId) return res.status(400).json({ error: 'No client for this user' });
    const c = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        waProvider: true,
        waPhoneNumberId: true,
        waBusinessAccountId: true,
        waPhoneDisplay: true,
        waVerifiedName: true,
        waConnectedAt: true,
        waAccessToken: true,
      },
    });
    const connected = !!(c && c.waProvider === 'CLOUD' && c.waAccessToken && c.waPhoneNumberId);
    res.json({
      connected,
      phoneDisplay: c?.waPhoneDisplay || null,
      verifiedName: c?.waVerifiedName || null,
      phoneNumberId: connected ? c?.waPhoneNumberId : null,
      wabaId: connected ? c?.waBusinessAccountId : null,
      connectedAt: c?.waConnectedAt || null,
    });
  } catch (error: any) {
    console.error('cloudStatus error:', error.message);
    res.status(500).json({ error: 'Failed to load status' });
  }
};

// DELETE /api/whatsapp-cloud/disconnect
export const disconnectCloud = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = resolveClientId(req);
    if (!clientId) return res.status(400).json({ error: 'No client for this user' });
    const c = await prisma.client.findUnique({ where: { id: clientId } });
    if (c?.waAccessToken && c.waBusinessAccountId) {
      try {
        await unsubscribeApp(c.waBusinessAccountId, c.waAccessToken);
      } catch (e: any) {
        console.error('unsubscribeApp failed:', e.response?.data || e.message);
      }
    }
    await prisma.client.update({
      where: { id: clientId },
      data: {
        waProvider: null,
        waBusinessAccountId: null,
        waPhoneNumberId: null,
        waAccessToken: null,
        waPin: null,
        waPhoneDisplay: null,
        waVerifiedName: null,
        waConnectedAt: null,
      },
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error('disconnectCloud error:', error.message);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
};

// Shared sender used by the portal and by n8n.
async function sendForClient(clientId: string, body: any) {
  const c = await prisma.client.findUnique({ where: { id: clientId } });
  if (!c || !c.waAccessToken || !c.waPhoneNumberId) {
    return { status: 404, json: { error: 'WhatsApp Cloud API is not connected for this client' } };
  }
  const { phoneNumber, text, mediaUrl, mediaType, caption, filename } = body || {};
  if (!phoneNumber) return { status: 400, json: { error: 'phoneNumber is required' } };
  if (mediaUrl) {
    const kind = (['image', 'video', 'document', 'audio'].includes(mediaType) ? mediaType : 'document') as MediaKind;
    const data = await sendMedia(c.waPhoneNumberId, c.waAccessToken, phoneNumber, kind, mediaUrl, {
      caption: caption || text,
      filename,
    });
    return { status: 200, json: { success: true, data } };
  }
  if (!text) return { status: 400, json: { error: 'text or mediaUrl is required' } };
  const data = await sendText(c.waPhoneNumberId, c.waAccessToken, phoneNumber, text);
  return { status: 200, json: { success: true, data } };
}

// POST /api/whatsapp-cloud/send  (portal user; clientId comes from the JWT)
export const sendFromPortal = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = resolveClientId(req);
    if (!clientId) return res.status(400).json({ error: 'No client for this user' });
    const r = await sendForClient(clientId, req.body);
    res.status(r.status).json(r.json);
  } catch (error: any) {
    console.error('sendFromPortal error:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || 'Failed to send message' });
  }
};

// POST /api/whatsapp-cloud/internal/send  (n8n; x-api-key header; body has clientId)
export const sendFromInternal = async (req: Request, res: Response) => {
  if (req.headers['x-api-key'] !== INTERNAL_API_KEY) return res.status(401).json({ error: 'Invalid API key' });
  try {
    const { clientId } = req.body || {};
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const r = await sendForClient(String(clientId), req.body);
    res.status(r.status).json(r.json);
  } catch (error: any) {
    console.error('sendFromInternal error:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || 'Failed to send message' });
  }
};

// GET /api/whatsapp-cloud/webhook  (Meta verification handshake)
export const webhookVerify = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (mode === 'subscribe' && expected && token === expected) {
    return res.status(200).send(String(challenge));
  }
  return res.sendStatus(403);
};

const validSignature = (req: Request): boolean => {
  if (!META_APP_SECRET) return true; // no secret configured: skip (not recommended in production)
  const sig = req.headers['x-hub-signature-256'];
  const raw: Buffer | undefined = (req as any).rawBody;
  if (typeof sig !== 'string' || !raw) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', META_APP_SECRET).update(raw).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
};

// POST /api/whatsapp-cloud/webhook  (incoming messages + status updates from Meta)
export const webhookReceive = async (req: Request, res: Response) => {
  if (!validSignature(req)) return res.sendStatus(401);
  res.sendStatus(200); // acknowledge fast; process after

  try {
    const body = req.body;
    if (body?.object !== 'whatsapp_business_account') return;
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;
        const value = change.value || {};
        const phoneNumberId: string | undefined = value.metadata?.phone_number_id;
        if (!phoneNumberId || !Array.isArray(value.messages)) continue;

        const client = await prisma.client.findFirst({ where: { waPhoneNumberId: phoneNumberId } });
        if (!client) {
          console.warn('Webhook for unknown phone_number_id', phoneNumberId);
          continue;
        }
        if (!client.n8nWebhookUrl) continue;

        for (const m of value.messages) {
          const contact = (value.contacts || []).find((c: any) => c.wa_id === m.from);
          const text = m.type === 'text' ? m.text?.body : m.button?.text || m.interactive?.button_reply?.title || '';
          try {
            await axios.post(
              client.n8nWebhookUrl,
              {
                source: 'whatsapp_cloud',
                clientId: client.id,
                phoneNumberId,
                from: m.from,
                name: contact?.profile?.name || null,
                messageId: m.id,
                timestamp: m.timestamp,
                type: m.type,
                text,
                raw: m,
              },
              { timeout: 15000 },
            );
          } catch (e: any) {
            console.error('Forward to n8n failed:', e.message);
          }
        }
      }
    }
  } catch (e: any) {
    console.error('webhookReceive error:', e.message);
  }
};
