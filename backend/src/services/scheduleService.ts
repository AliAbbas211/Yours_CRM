import cron from 'node-cron';
import moment from 'moment-timezone';
import prisma from '../prismaClient';

export const startScheduleService = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const activeConfigs = await prisma.agentConfig.findMany({
        where: { scheduleEnabled: true }
      });

      for (const config of activeConfigs) {
        if (!config.scheduleStartTime || !config.scheduleEndTime || !config.timezone) continue;

        // Get current time formatted as HH:mm in the client's timezone
        const currentTime = moment().tz(config.timezone).format('HH:mm');

        // Check for boundary triggers
        if (currentTime === config.scheduleStartTime) {
          // Time to turn ON
          if (!config.isActive) {
            await prisma.agentConfig.update({
              where: { id: config.id },
              data: { isActive: true }
            });
            console.log(`[Schedule] Turned ON agent for client ${config.id} at ${currentTime}`);
          }
        } else if (currentTime === config.scheduleEndTime) {
          // Time to turn OFF
          if (config.isActive) {
            await prisma.agentConfig.update({
              where: { id: config.id },
              data: { isActive: false }
            });
            console.log(`[Schedule] Turned OFF agent for client ${config.id} at ${currentTime}`);
          }
        }
      }
    } catch (error) {
      console.error('[Schedule] Error running automated check:', error);
    }
  });

  console.log('[Schedule] Service started.');
};
