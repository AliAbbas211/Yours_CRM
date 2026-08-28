import { Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import prisma from '../prismaClient';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'change-me';

const ECOMMERCE_CONFIRM_WEBHOOK_URL =
  process.env.ECOMMERCE_CONFIRM_WEBHOOK_URL ||
  'https://n8n.srv1599086.hstgr.cloud/webhook/ecommerce-order-confirm';

const ECOMMERCE_MODULE = 'ECOMMERCE_INTEGRATION';

// Normalizes an incoming order webhook body into our internal shape,
// regardless of which e-commerce platform sent it. This lets clients paste
// the SAME webhook URL into WooCommerce, Shopify-style generic webhooks, or
// their own custom integration — no code changes needed on their side.
//
// Returns null for a payload that isn't a real order (e.g. WooCommerce's
// automatic webhook "ping" test delivery, which has no billing/line_items
// and no generic fields either) so the caller can 200 it without creating
// a spurious order.
const normalizeOrderPayload = (
  body: any
): {
  externalOrderId?: string;
  customerName: string;
  customerPhone: string;
  products: string;
  address?: string;
  total?: number;
} | null => {
  // --- WooCommerce native "Order created" webhook shape ---
  // { id, number, billing: { first_name, last_name, phone, address_1, address_2, city, state, country }, line_items: [{ name, quantity }], total }
  if (body && (body.billing || body.line_items)) {
    const billing = body.billing || {};
    const customerName = [billing.first_name, billing.last_name].filter(Boolean).join(' ').trim();
    const customerPhone = billing.phone || '';
    const lineItems = Array.isArray(body.line_items) ? body.line_items : [];
    const products = lineItems.map((li: any) => `${li.quantity || 1}x ${li.name || 'Item'}`).join(', ');
    const address = [billing.address_1, billing.address_2, billing.city, billing.state, billing.country]
      .filter(Boolean)
      .join(', ');

    if (!customerName || !customerPhone || !products) {
      // Has the WooCommerce shape but missing the fields we need (e.g. a
      // malformed or partial test payload) — treat as not a real order.
      return null;
    }

    return {
      externalOrderId: body.number ? String(body.number) : body.id ? String(body.id) : undefined,
      customerName,
      customerPhone,
      products,
      address: address || undefined,
      total: body.total !== undefined ? parseFloat(body.total) : undefined,
    };
  }

  // --- Generic shape (our own documented format) ---
  const { externalOrderId, customerName, customerPhone, products, address, total } = body || {};
  if (!customerName || !customerPhone || !products) {
    return null;
  }
  return {
    externalOrderId: externalOrderId ? String(externalOrderId) : undefined,
    customerName,
    customerPhone,
    products: String(products),
    address: address || undefined,
    total: total !== undefined ? parseFloat(total) : undefined,
  };
};

// Normalizes a raw phone number (digits only) to a consistent international
// format. Handles the common case where a customer types their number in
// local format (leading 0) at checkout instead of with the country code —
// otherwise this same customer ends up with two disconnected Lead records:
// one from WhatsApp (full JID, country-code prefixed) and one from the
// store checkout (local format), and the two never link up.
const normalizePakistaniPhone = (digits: string): string => {
  if (digits.length === 11 && digits.startsWith('0')) {
    return '92' + digits.slice(1);
  }
  return digits;
};

export const receiveEcommerceOrder = async (req: Request, res: Response) => {
  try {
    const clientIdParam = req.params.clientId;
    const secretParam = req.params.secret;
    const clientId = Array.isArray(clientIdParam) ? clientIdParam[0] : clientIdParam;
    const secret = Array.isArray(secretParam) ? secretParam[0] : secretParam;

    if (!clientId || !secret) {
      return res.status(400).json({ error: 'clientId and secret are required in the URL' });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return res.status(404).json({ error: 'Unknown client' });
    }
    if (!(client as any).ecommerceWebhookSecret || (client as any).ecommerceWebhookSecret !== secret) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }
    if (!((client as any).enabledModules || []).includes(ECOMMERCE_MODULE)) {
      return res.status(403).json({ error: 'E-commerce integration is not enabled for this account. Contact support.' });
    }
    if (client.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    const normalized = normalizeOrderPayload(req.body);
    if (!normalized) {
      // Most commonly: WooCommerce's webhook-creation "ping" delivery, which
      // sends an empty/minimal body to verify the URL responds with 2xx.
      // Acknowledge it without creating an order.
      return res.status(200).json({ success: true, ignored: true, reason: 'Payload did not contain a recognizable order (no customerName/customerPhone/products, and no WooCommerce billing/line_items).' });
    }

    const { externalOrderId, customerName, customerPhone, products, address, total } = normalized;

    const rawDigits = String(customerPhone).replace(/[^\d]/g, '');
    const phoneNumber = normalizePakistaniPhone(rawDigits);
    if (!phoneNumber) {
      return res.status(400).json({ error: 'customerPhone must contain digits (country code + number, no + or spaces)' });
    }

    // IMPORTANT: leads created from WhatsApp messages are keyed by the full
    // WhatsApp JID (e.g. "923352352689@s.whatsapp.net"), not a plain phone
    // number. If we upsert the Lead here with a plain-digit phoneNumber, it
    // creates a SEPARATE, disconnected lead — and the pending-confirmation
    // flag we set below never reaches the lead the customer is actually
    // chatting from on WhatsApp, so their "Yes" reply is never recognized
    // as an order confirmation. Match the same format so both flows hit the
    // exact same lead record.
    const whatsappLeadPhone = `${phoneNumber}@s.whatsapp.net`;

    const lead = await prisma.lead.upsert({
      where: { clientId_phoneNumber: { clientId, phoneNumber: whatsappLeadPhone } },
      update: { name: customerName, source: 'E-commerce' },
      create: { clientId, name: customerName, phoneNumber: whatsappLeadPhone, source: 'E-commerce' },
    });

    const order = await prisma.order.create({
      data: {
        clientId,
        name: customerName,
        phoneNumber,
        products,
        address: address || '',
        status: 'PENDING',
        source: 'ECOMMERCE',
        externalOrderId,
        total,
      } as any,
    });

    await prisma.lead.update({
      where: { id: lead.id },
      data: { pendingConfirmationOrderId: order.id } as any,
    });

    try {
      await axios.post(ECOMMERCE_CONFIRM_WEBHOOK_URL, {
        clientId,
        phoneNumber,
        customerName,
        orderId: order.id,
        externalOrderId: order.externalOrderId,
        products: order.products,
        address: order.address,
        total: order.total,
        // Included directly so the n8n workflow doesn't need a second
        // lookup call just to know where/how to send the WhatsApp message.
        evolutionApiUrl: client.evolutionApiUrl,
        evolutionApiKey: client.evolutionApiKey,
        instanceName: client.instanceName,
      }, { timeout: 8000 });
    } catch (notifyError: any) {
      console.error('Failed to trigger WhatsApp order-confirmation message:', notifyError.message);
    }

    res.status(201).json({ success: true, orderId: order.id, status: order.status });
  } catch (error) {
    console.error('receiveEcommerceOrder error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const confirmOrderFromBot = async (req: Request, res: Response) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== INTERNAL_API_KEY) return res.status(401).json({ error: 'Invalid API key' });

  try {
    const orderIdParam = req.params.orderId;
    const orderId = Array.isArray(orderIdParam) ? orderIdParam[0] : orderIdParam;
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CONFIRMED' },
    });

    await prisma.lead.updateMany({
      where: { clientId: order.clientId, pendingConfirmationOrderId: orderId } as any,
      data: { pendingConfirmationOrderId: null } as any,
    });

    const client = await prisma.client.findUnique({ where: { id: order.clientId } });
    const callbackUrl = (client as any)?.ecommerceOrderConfirmCallbackUrl;

    if ((order as any).source === 'ECOMMERCE' && callbackUrl) {
      try {
        await axios.post(callbackUrl, {
          orderId: order.id,
          externalOrderId: (order as any).externalOrderId,
          status: 'CONFIRMED',
        }, { timeout: 8000 });
      } catch (callbackError: any) {
        console.error(`Failed to notify client callback URL for order ${orderId}:`, callbackError.message);
      }
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('confirmOrderFromBot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEcommerceConfig = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.clientId;
    if (!clientId) return res.status(403).json({ message: 'Client ID required' });

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const enabled = ((client as any).enabledModules || []).includes(ECOMMERCE_MODULE);
    const backendBaseUrl = process.env.PUBLIC_BACKEND_URL || 'http://2.24.212.209';

    res.json({
      moduleEnabled: enabled,
      platform: (client as any).ecommercePlatform || 'CUSTOM',
      callbackUrl: (client as any).ecommerceOrderConfirmCallbackUrl || '',
      webhookUrl: enabled && (client as any).ecommerceWebhookSecret
        ? `${backendBaseUrl}/api/webhooks/ecommerce/${client.id}/${(client as any).ecommerceWebhookSecret}`
        : null,
    });
  } catch (error) {
    console.error('getEcommerceConfig error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const regenerateEcommerceSecret = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.clientId;
    if (!clientId) return res.status(403).json({ message: 'Client ID required' });

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    if (!((client as any).enabledModules || []).includes(ECOMMERCE_MODULE)) {
      return res.status(403).json({ message: 'E-commerce integration is not enabled for your account. Contact support to enable it.' });
    }

    const secret = crypto.randomBytes(20).toString('hex');
    const updated = await prisma.client.update({
      where: { id: clientId },
      data: { ecommerceWebhookSecret: secret } as any,
    });

    const backendBaseUrl = process.env.PUBLIC_BACKEND_URL || 'http://2.24.212.209';
    res.json({
      webhookUrl: `${backendBaseUrl}/api/webhooks/ecommerce/${updated.id}/${secret}`,
    });
  } catch (error) {
    console.error('regenerateEcommerceSecret error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateEcommerceCallback = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.clientId;
    if (!clientId) return res.status(403).json({ message: 'Client ID required' });

    const { platform, callbackUrl } = req.body;

    const client = await prisma.client.update({
      where: { id: clientId },
      data: {
        ecommercePlatform: platform || undefined,
        ecommerceOrderConfirmCallbackUrl: callbackUrl !== undefined ? callbackUrl : undefined,
      } as any,
    });

    res.json({
      success: true,
      platform: (client as any).ecommercePlatform,
      callbackUrl: (client as any).ecommerceOrderConfirmCallbackUrl,
    });
  } catch (error) {
    console.error('updateEcommerceCallback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const toggleClientModule = async (req: Request, res: Response) => {
  try {
    const clientIdParam = req.params.clientId;
    const clientId = Array.isArray(clientIdParam) ? clientIdParam[0] : clientIdParam;
    const { module, enabled } = req.body;

    if (!clientId || !module || typeof enabled !== 'boolean') {
      return res.status(400).json({ message: 'clientId (param), module, and enabled (boolean) are required' });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const current: string[] = (client as any).enabledModules || [];
    const next = enabled
      ? Array.from(new Set([...current, module]))
      : current.filter((m) => m !== module);

    const data: any = { enabledModules: next };

    if (enabled && module === ECOMMERCE_MODULE && !(client as any).ecommerceWebhookSecret) {
      data.ecommerceWebhookSecret = crypto.randomBytes(20).toString('hex');
    }

    const updated = await prisma.client.update({ where: { id: clientId }, data });

    await prisma.auditLog.create({
      data: {
        userId: (req as any).user?.userId,
        action: enabled ? 'MODULE_ENABLED' : 'MODULE_DISABLED',
        details: `${module} ${enabled ? 'enabled' : 'disabled'} for client ${clientId}`,
      },
    });

    res.json({
      message: `${module} ${enabled ? 'enabled' : 'disabled'}`,
      enabledModules: (updated as any).enabledModules,
    });
  } catch (error) {
    console.error('toggleClientModule error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
