import cron from 'node-cron';
import prisma from '../prismaClient';

// Runs every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily subscription expiry check...');
  try {
    const today = new Date();

    const expiredClients = await prisma.client.updateMany({
      where: {
        subscriptionEndDate: {
          lt: today
        },
        status: {
          not: 'EXPIRED'
        }
      },
      data: {
        status: 'EXPIRED',
        botEnabled: false // Turn off bots for expired clients
      }
    });

    console.log(`Updated ${expiredClients.count} clients to EXPIRED status.`);

    // Could add notification logic here (Email to Admin, Webhook to n8n, etc.)
  } catch (error) {
    console.error('Error during subscription expiry check:', error);
  }
});
