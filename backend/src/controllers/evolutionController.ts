import { Request, Response } from 'express';
import axios from 'axios';
import prisma from '../prismaClient';

export const getEvolutionStatus = async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId as string;

    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client || !client.instanceName || !client.evolutionApiUrl || !client.evolutionApiKey) {
      return res.status(404).json({ message: 'Client or Evolution Configuration not found' });
    }

    try {
      const evoResponse = await axios.get(
        `${client.evolutionApiUrl}/instance/connectionState/${client.instanceName}`,
        {
          headers: {
            'apikey': client.evolutionApiKey
          }
        }
      );

      // evoResponse.data typically contains { instance: { state: "open" } }
      const state = evoResponse.data?.instance?.state || evoResponse.data?.state || 'closed';
      
      return res.json({ 
        status: state === 'open' ? 'ONLINE' : 'OFFLINE',
        rawState: state 
      });
    } catch (evoError: any) {
      console.error('Evolution Status Error:', evoError.message);
      return res.json({ status: 'OFFLINE', rawState: 'error' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const connectEvolutionInstance = async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId as string;

    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client || !client.instanceName || !client.evolutionApiUrl || !client.evolutionApiKey) {
      return res.status(404).json({ message: 'Client or Evolution Configuration not found' });
    }

    try {
      // First, try to connect
      let evoResponse;
      try {
        evoResponse = await axios.get(
          `${client.evolutionApiUrl}/instance/connect/${client.instanceName}`,
          { headers: { 'apikey': client.evolutionApiKey } }
        );
      } catch (err: any) {
        // If it fails (possibly because instance doesn't exist), try to create it
        if (err.response?.status === 404 || err.response?.data?.message?.includes("not found")) {
          console.log(`Instance ${client.instanceName} not found, attempting to create...`);
          await axios.post(
            `${client.evolutionApiUrl}/instance/create`,
            {
              instanceName: client.instanceName,
              qrcode: true,
              integration: 'WHATSAPP-BAILEYS',
            },
            { headers: { 'apikey': client.evolutionApiKey, 'Content-Type': 'application/json' } }
          );
          
          // Try connecting again
          evoResponse = await axios.get(
            `${client.evolutionApiUrl}/instance/connect/${client.instanceName}`,
            { headers: { 'apikey': client.evolutionApiKey } }
          );
        } else {
          throw err;
        }
      }

      return res.json(evoResponse.data);
    } catch (evoError: any) {
      console.error('Evolution Connect Error:', evoError.message);
      return res.status(500).json({ 
        message: 'Failed to fetch QR code from Evolution API',
        error: evoError.response?.data || evoError.message
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const logoutEvolutionInstance = async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId as string;

    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client || !client.instanceName || !client.evolutionApiUrl || !client.evolutionApiKey) {
      return res.status(404).json({ message: 'Client or Evolution Configuration not found' });
    }

    try {
      await axios.delete(
        `${client.evolutionApiUrl}/instance/logout/${client.instanceName}`,
        { headers: { 'apikey': client.evolutionApiKey } }
      );
      return res.json({ status: 'SUCCESS' });
    } catch (evoError: any) {
      console.error('Evolution Logout Error:', evoError.message);
      // Even if it errors (e.g. 404), it's effectively disconnected now
      return res.json({ status: 'SUCCESS', message: 'Instance may have already been logged out' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { clientId, phoneNumber, text } = req.body;
    if (!clientId || !phoneNumber || !text) {
      return res.status(400).json({ error: 'clientId, phoneNumber and text are required' });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client || !client.instanceName || !client.evolutionApiUrl || !client.evolutionApiKey) {
      return res.status(404).json({ error: 'Client or Evolution config not found' });
    }

    const payload = {
      number: phoneNumber, // e.g., "5511999999999"
      text: text,
      delay: 1000,
    };

    const url = `${client.evolutionApiUrl}/message/sendText/${client.instanceName}`;
    const response = await axios.post(url, payload, {
      headers: { 'apikey': client.evolutionApiKey, 'Content-Type': 'application/json' },
    });

    res.json({ success: true, data: response.data });
  } catch (error: any) {
    console.error('Send message error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
};