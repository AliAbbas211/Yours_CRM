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
  toWaNumber,
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

// Store a message in the CRM inbox (best-effort: never breaks sending/receiving).
async function saveMessage(m: {
  clientId: string; waId: string; direction: 'IN' | 'OUT'; type?: string; text?: string | null;
  contactName?: string | null; waMessageId?: string | null; createdAt?: Date;
}) {
  try {
    await (prisma as any).waCloudMessage.create({
      data: {
        clientId: m.clientId,
        waId: m.waId,
        direction: m.direction,
        type: m.type || 'text',
        text: m.text || null,
        contactName: m.contactName || null,
        waMessageId: m.waMessageId || null,
        ...(m.createdAt ? { createdAt: m.createdAt } : {}),
      },
    });
  } catch (e: any) {
    console.error('saveMessage failed:', e.message);
  }
}

// POST /api/whatsapp-cloud/connect  { code, wabaId, phoneNumberId }
//   or  { accessToken, wabaId, phoneNumberId }  (manual connect: number already set up in WhatsApp Manager)
export const connectCloud = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = resolveClientId(req);
    const { code, wabaId, phoneNumberId, coexistence, accessToken } = req.body || {};
    if (!clientId) return res.status(400).json({ error: 'No client for this user' });
    const manual = !!accessToken;
    if ((!code && !manual) || !wabaId || !phoneNumberId) {
      return res.status(400).json({ error: manual ? 'wabaId, phoneNumberId and accessToken are required' : 'code, wabaId and phoneNumberId are required' });
    }

    const token = manual ? String(accessToken).trim() : await exchangeCodeForToken(String(code));

    // Manual connect: make sure the token really works for this phone number before saving it.
    if (manual) {
      try {
        await getPhoneDetails(String(phoneNumberId), token);
      } catch (e: any) {
        return res.status(400).json({ error: e.response?.data?.error?.message || 'Meta rejected this token / phone number ID.' });
      }
    }

    // Subscribe our app to the customer's WABA so webhooks (incoming messages) reach us.
    try {
      await subscribeApp(String(wabaId), token);
    } catch (e: any) {
      console.error('subscribeApp failed:', e.response?.data || e.message);
    }

    // Register the number on Cloud API (needed for numbers added through Embedded Signup).
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    try {
      if (manual) {
        // number is already registered in WhatsApp Manager: nothing to do
      } else if (coexistence) {
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
        waPin: coexistence || manual ? null : pin,
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

// Turn Meta send errors into clear, actionable responses (instead of a bare 500).
function sendErrorResponse(error: any) {
  const e = error?.response?.data?.error;
  const code = e?.code;
  const msg = e?.message || error?.message || 'Failed to send message';
  if (code === 131047 || code === 131026) {
    return { status: 409, json: { error: 'The 24-hour customer service window is closed. The customer must message first, or an approved template must be used.', code, metaError: msg } };
  }
  if (code === 131030) {
    return { status: 400, json: { error: 'This recipient is not in the allowed list for the test number. Add and verify the number in Meta API Setup first.', code, metaError: msg } };
  }
  if (code === 190) {
    return { status: 401, json: { error: 'The WhatsApp access token is invalid or has expired. Reconnect the number with a fresh token.', code, metaError: msg } };
  }
  if (e) return { status: 502, json: { error: msg, code } };
  return { status: 500, json: { error: msg } };
}

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
    await saveMessage({ clientId, waId: toWaNumber(phoneNumber), direction: 'OUT', type: kind, text: caption || text || `[${kind}]`, waMessageId: data?.messages?.[0]?.id });
    return { status: 200, json: { success: true, data } };
  }
  if (!text) return { status: 400, json: { error: 'text or mediaUrl is required' } };
  const data = await sendText(c.waPhoneNumberId, c.waAccessToken, phoneNumber, text);
  await saveMessage({ clientId, waId: toWaNumber(phoneNumber), direction: 'OUT', type: 'text', text, waMessageId: data?.messages?.[0]?.id });
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
    const r = sendErrorResponse(error);
    res.status(r.status).json(r.json);
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
    const r = sendErrorResponse(error);
    res.status(r.status).json(r.json);
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

        for (const m of value.messages) {
          const contact = (value.contacts || []).find((c: any) => c.wa_id === m.from);
          const text = m.type === 'text' ? m.text?.body : m.button?.text || m.interactive?.button_reply?.title || '';
          await saveMessage({
            clientId: client.id,
            waId: String(m.from),
            direction: 'IN',
            type: m.type,
            text: text || `[${m.type}]`,
            contactName: contact?.profile?.name || null,
            waMessageId: m.id,
            createdAt: m.timestamp ? new Date(Number(m.timestamp) * 1000) : undefined,
          });
          if (!client.n8nWebhookUrl) continue;
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

// GET /api/whatsapp-cloud/conversations  (portal): one row per customer, newest first.
export const listConversations = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = resolveClientId(req);
    if (!clientId) return res.status(400).json({ error: 'No client for this user' });
    const rows = await (prisma as any).waCloudMessage.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const seen = new Map<string, any>();
    for (const r of rows) {
      const cur = seen.get(r.waId);
      if (!cur) seen.set(r.waId, { waId: r.waId, name: r.contactName || null, lastText: r.text, lastDirection: r.direction, lastAt: r.createdAt });
      else if (!cur.name && r.contactName) cur.name = r.contactName;
    }
    res.json({ conversations: Array.from(seen.values()) });
  } catch (error: any) {
    console.error('listConversations error:', error.message);
    res.status(500).json({ error: 'Failed to load conversations' });
  }
};

// GET /api/whatsapp-cloud/messages?waId=...  (portal): thread with one customer, oldest first.
export const listMessages = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = resolveClientId(req);
    if (!clientId) return res.status(400).json({ error: 'No client for this user' });
    const waId = toWaNumber(String(req.query.waId || ''));
    if (!waId) return res.status(400).json({ error: 'waId is required' });
    const rows = await (prisma as any).waCloudMessage.findMany({
      where: { clientId, waId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ messages: rows.reverse().map((r: any) => ({ id: r.id, direction: r.direction, type: r.type, text: r.text, createdAt: r.createdAt })) });
  } catch (error: any) {
    console.error('listMessages error:', error.message);
    res.status(500).json({ error: 'Failed to load messages' });
  }
};
