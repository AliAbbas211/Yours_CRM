const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

async function test() {
  const clients = await prisma.client.findMany();
  for (const client of clients) {
    try {
      const res = await axios.get(`http://localhost:5000/api/evolution/status/${client.id}`);
      console.log(`Client ${client.instanceName}:`, res.data);
    } catch (e) {
      console.log(`Client ${client.instanceName}: error ${e.message}`);
    }
  }
}

test();
