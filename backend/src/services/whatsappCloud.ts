import axios from 'axios';

export const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v21.0';
export const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
export const META_APP_ID = process.env.META_APP_ID || '2124875408239522';
export const META_APP_SECRET = process.env.META_APP_SECRET || '';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// Exchange the short-lived code returned by Embedded Signup for a business access token.
export async function exchangeCodeForToken(code: string): Promise<string> {
  if (!META_APP_SECRET) throw new Error('META_APP_SECRET is not configured on the server');
  const res = await axios.get(`${GRAPH}/oauth/access_token`, {
    params: { client_id: META_APP_ID, client_secret: META_APP_SECRET, code },
    timeout: 20000,
  });
  if (!res.data?.access_token) throw new Error('No access_token in Meta response');
  return res.data.access_token as string;
}

export async function getPhoneDetails(phoneNumberId: string, token: string) {
  const res = await axios.get(`${GRAPH}/${phoneNumberId}`, {
    params: { fields: 'display_phone_number,verified_name,quality_rating' },
    headers: auth(token),
    timeout: 20000,
  });
  return res.data as { display_phone_number?: string; verified_name?: string; quality_rating?: string };
}

export async function subscribeApp(wabaId: string, token: string) {
  const res = await axios.post(`${GRAPH}/${wabaId}/subscribed_apps`, {}, { headers: auth(token), timeout: 20000 });
  return res.data;
}

export async function unsubscribeApp(wabaId: string, token: string) {
  const res = await axios.delete(`${GRAPH}/${wabaId}/subscribed_apps`, { headers: auth(token), timeout: 20000 });
  return res.data;
}

export async function registerPhone(phoneNumberId: string, token: string, pin: string) {
  const res = await axios.post(
    `${GRAPH}/${phoneNumberId}/register`,
    { messaging_product: 'whatsapp', pin },
    { headers: auth(token), timeout: 20000 },
  );
  return res.data;
}

// Normalise a phone number to digits only (WhatsApp Cloud API wants e.g. 923001234567).
export const toWaNumber = (n: string) => String(n || '').replace(/\D/g, '');

export async function sendText(phoneNumberId: string, token: string, to: string, body: string) {
  const res = await axios.post(
    `${GRAPH}/${phoneNumberId}/messages`,
    { messaging_product: 'whatsapp', to: toWaNumber(to), type: 'text', text: { body, preview_url: true } },
    { headers: auth(token), timeout: 20000 },
  );
  return res.data;
}

export type MediaKind = 'image' | 'video' | 'document' | 'audio';

export async function sendMedia(
  phoneNumberId: string,
  token: string,
  to: string,
  kind: MediaKind,
  link: string,
  opts: { caption?: string; filename?: string } = {},
) {
  const media: any = { link };
  if (kind !== 'audio' && opts.caption) media.caption = opts.caption;
  if (kind === 'document' && opts.filename) media.filename = opts.filename;
  const res = await axios.post(
    `${GRAPH}/${phoneNumberId}/messages`,
    { messaging_product: 'whatsapp', to: toWaNumber(to), type: kind, [kind]: media },
    { headers: auth(token), timeout: 30000 },
  );
  return res.data;
}
