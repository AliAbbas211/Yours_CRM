import { Request, Response } from 'express';
import prisma from '../prismaClient';

export const getGlobalSettings = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const settings = await prisma.globalSetting.findMany();
    // Convert array to object key-value pairs
    const settingsMap = settings.reduce((acc: any, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
    res.json(settingsMap);
  } catch (error) {
    console.error('Error fetching global settings:', error);
    res.status(500).json({ error: 'Failed to fetch global settings' });
  }
};

export const updateGlobalSetting = async (req: Request, res: Response) => {
  try {
    const { key, value } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: 'Key is required' });
    }

    // @ts-ignore
    const setting = await prisma.globalSetting.upsert({
      where: { key },
      update: { value: value || '' },
      create: { key, value: value || '' }
    });

    res.json(setting);
  } catch (error) {
    console.error('Error updating global setting:', error);
    res.status(500).json({ error: 'Failed to update global setting' });
  }
};
