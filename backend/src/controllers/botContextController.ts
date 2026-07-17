import { Request, Response } from 'express';
import moment from 'moment-timezone';
import prisma from '../prismaClient';

/**
 * GET /api/bot/context?instance=xxx
 *
 * This is THE endpoint that replaces every hardcoded thing in the old n8n
 * workflow: the restaurant menu, the delivery-charge table, the system
 * message, and the schedule/kill-switch logic. n8n calls this once per
 * incoming message (right after Get Client Config) and uses the returned
 * `systemPrompt` directly as the AI Agent's system message, and `botActive`
 * to decide whether to process the message at all.
 */
export const getBotContext = async (req: Request, res: Response) => {
  try {
    const { instance } = req.query as { instance: string };
    if (!instance) return res.status(400).json({ message: 'instance query param is required' });

    const client = await prisma.client.findFirst({
      where: { instanceName: instance },
      // @ts-ignore - agentConfig relation
      include: { agentConfig: true },
    });

    if (!client) return res.status(404).json({ message: 'No client found for this instance' });

    // @ts-ignore
    const agentConfig = client.agentConfig;

    // ---- 1. Determine if the bot should respond at all ----
    const superAdminDisabled = (agentConfig as { disabledBySuperAdmin?: boolean } | null | undefined)?.disabledBySuperAdmin === true;
    const clientDisabled = agentConfig?.isActive === false;
    const subscriptionInactive = client.status !== 'ACTIVE';

    let withinSchedule = true;
    let scheduleInfo: any = null;
    if (agentConfig?.scheduleEnabled && agentConfig.scheduleStartTime && agentConfig.scheduleEndTime) {
      const tz = agentConfig.timezone || 'UTC';
      const now = moment().tz(tz).format('HH:mm');
      const { scheduleStartTime: start, scheduleEndTime: end } = agentConfig;

      // Handles overnight ranges too (e.g. 22:00 -> 06:00)
      withinSchedule = start <= end ? now >= start && now <= end : now >= start || now <= end;
      scheduleInfo = { start, end, timezone: tz, currentTime: now, withinSchedule };
    }

    const botActive = !superAdminDisabled && !clientDisabled && !subscriptionInactive && withinSchedule;

    // ---- 2. Pull knowledge base + products ----
    const kb = await prisma.knowledgeBase.findMany({ where: { clientId: client.id } });
    const products = await (prisma as any).product.findMany({
      where: { clientId: client.id, isActive: true } as any,
      orderBy: { createdAt: 'asc' },
    });

    const kbText = kb.length
      ? kb.map((k) => `### ${k.title}\n${k.content ? k.content : k.fileUrl ? `(Reference file: ${k.fileUrl})` : ''}`).join('\n\n')
      : '(No knowledge base entries configured yet — rely on general helpfulness and the product catalog below.)';

    const productsText = (products as any[]).length
      ? (products as any[])
          .map((p) => {
            const mediaLines: string[] = [];
            if (p.images?.length) mediaLines.push(`  Image URL(s): ${p.images.join(', ')}`);
            if (p.videos?.length) mediaLines.push(`  Video URL(s): ${p.videos.join(', ')}`);
            return `- **${p.name}**${p.category ? ` [${p.category}]` : ''} — Price: ${p.price}\n  ${p.description || ''}\n${mediaLines.join('\n')}`;
          })
          .join('\n')
      : '(No products configured yet.)';

    // ---- 3. Build the full dynamic system prompt ----
    const systemPrompt = `You are a SMART, friendly order-taking assistant for "${client.companyName}". You handle customers like a real human support agent would.

## BUSINESS KNOWLEDGE BASE
${kbText}

## PRODUCT CATALOG
${productsText}

## ORDER FLOW (STRICT)
1. Before completing an order you must know: customer_name, product, address. Ask naturally for whatever is missing — never re-ask something already given.
2. The moment all three are known, end your reply with this EXACT JSON block (nothing else after it):
\`\`\`json
{
  "action": "order_complete",
  "order": {
    "customer_name": "...",
    "product": "...",
    "address": "...",
    "phone": "..."
  }
}
\`\`\`
3. Do not calculate prices or delivery charges yourself — the system calculates the final invoice automatically and will send it as a PDF once the order is saved.

## MEDIA RULES
- To show a product image, include exactly: [IMAGE: <exact URL from the catalog above>]
- To show a product video, include exactly: [VIDEO: <exact URL from the catalog above>]
- NEVER invent a URL that isn't listed in the catalog above. If a customer asks about a product not in the catalog, say it's currently unavailable.

## MEMORY
You have perfect memory of this entire conversation. Never ask a question the customer already answered — check the conversation history first.

## MULTI-MEDIA INPUT
The customer may send images, videos, voice notes, or documents. You will receive a text description of what they sent — respond to the actual content described (e.g. if they show a photo of a specific dish, talk about that specific dish), never say you "can't see" media.

## CAPABILITIES
You CAN send voice replies, images, videos, documents, and PDF invoices — the system handles the actual sending. Never claim you're text-only or that you "can't" do these things.

## LANGUAGE
Always respond in the same language/style the customer uses (English, Urdu, Roman Urdu, mixed, etc).`;

    res.json({
      success: true,
      data: {
        customerId: client.id,
        companyName: client.companyName,
        systemPrompt,
        botActive,
        subscriptionInactive,
        superAdminDisabled,
        scheduleInfo,
        originLat: (client as any).originLat ?? null,
        originLng: (client as any).originLng ?? null,
        defaultAiModel: client.defaultAiModel,
        temperature: client.temperature,
        n8nWebhookUrl: client.n8nWebhookUrl,
        evolutionApiUrl: client.evolutionApiUrl,
        evolutionApiKey: client.evolutionApiKey,
      },
    });
  } catch (error) {
    console.error('getBotContext error:', error);
    res.status(500).json({ message: 'Server error building bot context' });
  }
};
