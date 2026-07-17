const axios = require('axios');

async function test() {
  try {
    const res = await axios.get('https://evalution-2-evolution-api.a65iq4.easypanel.host/instance/connectionState/whatbot', {
      headers: { apikey: 'EvoApiSecretKey2026!' }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}

test();
