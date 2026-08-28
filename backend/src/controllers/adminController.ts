import { Request, Response } from 'express';
import prisma from '../prismaClient';

export const getClientConfigForN8n = async (req: Request, res: Response) => {
  try {
    const { instance } = req.query;

    if (!instance || typeof instance !== 'string') {
      return res.status(400).json({ error: 'Instance name is required as a query parameter' });
    }

    const client = await prisma.client.findFirst({
      where: { instanceName: instance },
      include: { agentConfig: true },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found for this instance' });
    }

    if (client.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'Client subscription is not active',
        status: client.status,
      });
    }

    res.json({
      success: true,
      data: {
        customerId: client.id,
        companyName: client.companyName,
        n8nWebhookUrl: client.n8nWebhookUrl,
        evolutionApiUrl: client.evolutionApiUrl,
        evolutionApiKey: client.evolutionApiKey,
        botEnabled: client.agentConfig?.isActive ?? false,
        defaultAiModel: client.defaultAiModel,
        defaultPrompt: client.defaultPrompt,
      },
    });
  } catch (error) {
    console.error('n8n Bridge API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * SUPER_ADMIN ONLY. Forcibly disables a client's bot. Sets both isActive=false
 * AND disabledBySuperAdmin=true — the second flag is what prevents the client
 * from flipping isActive back on themselves from their own portal.
 *
 * IMPORTANT: AgentConfig has its own auto-generated `id` (_id), separate
 * from the client's id — only the uniquely-indexed `clientId` field links
 * the two records. Looking this up by `where: { id: clientId }` silently
 * fails to find the existing record for any normally-provisioned client
 * (whose AgentConfig._id was auto-generated, not forced to equal the
 * client's id), which made this upsert fall through to `create` and throw
 * a duplicate-key error on the unique `clientId` field — i.e. disabling or
 * enabling a client's bot from the admin panel would 500. Must key off
 * `clientId`.
 */
export const disableClientBot = async (req: Request, res: Response) => {
  try {
    const clientIdParam = req.params.clientId;
    const clientId = Array.isArray(clientIdParam) ? clientIdParam[0] : clientIdParam;

    if (typeof clientId !== 'string' || !clientId.trim()) {
      return res.status(400).json({ message: 'Client ID is required' });
    }

    const agentConfig = await prisma.agentConfig.upsert({
      where: { clientId } as any,
      update: { isActive: false, disabledBySuperAdmin: true, status: 'OFFLINE' } as any,
      create: {
        clientId,
        isActive: false,
        disabledBySuperAdmin: true,
        status: 'OFFLINE',
      } as any,
    });

    await prisma.auditLog.create({
      data: {
        userId: (req as any).user?.userId,
        action: 'BOT_DISABLED_BY_SUPER_ADMIN',
        details: `Bot disabled for client ${clientId}`,
      },
    });

    res.json({ message: 'Bot disabled. The client cannot re-enable it themselves.', agentConfig });
  } catch (error) {
    console.error('disableClientBot error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * SUPER_ADMIN ONLY. Clears the kill switch and re-enables the bot.
 * See the note on disableClientBot above — same clientId-vs-id fix applies.
 */
export const enableClientBot = async (req: Request, res: Response) => {
  try {
    const clientIdParam = req.params.clientId;
    const clientId = Array.isArray(clientIdParam) ? clientIdParam[0] : clientIdParam;

    if (typeof clientId !== 'string' || !clientId.trim()) {
      return res.status(400).json({ message: 'Client ID is required' });
    }

    const agentConfig = await prisma.agentConfig.upsert({
      where: { clientId } as any,
      update: { isActive: true, disabledBySuperAdmin: false, status: 'ONLINE' } as any,
      create: {
        clientId,
        isActive: true,
        disabledBySuperAdmin: false,
        status: 'ONLINE',
      } as any,
    });

    await prisma.auditLog.create({
      data: {
        userId: (req as any).user?.userId,
        action: 'BOT_ENABLED_BY_SUPER_ADMIN',
        details: `Bot re-enabled for client ${clientId}`,
      },
    });

    res.json({ message: 'Bot re-enabled.', agentConfig });
  } catch (error) {
    console.error('enableClientBot error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
