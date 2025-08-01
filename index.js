import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const app = express();
const port = 8000;

let ids = { "toto": "9c02ea8a-5e35-554d-a897-4119aec05228" }

async function getMMR(puuid) {
  const response = await fetch(`https://api.henrikdev.xyz/valorant/v3/by-puuid/mmr/eu/pc/${puuid}`, {
    method: 'GET',
    headers: {
      "Authorization": process.env.API_KEY,
      "Accept": "*/*"
    },
  });

  return await response.json();
}

app.get("/toto", async (req, res) => {
  const mmr_data = await getMMR(ids.toto);
  if (mmr_data.error) {
    res.send(`Error ${mmr_data.status}`);
    return console.log(`ID: ${ids.toto} Error: ${mmr_data.status}`);
  }
  res.send(`[${mmr_data.data.current.tier.name}]: ${mmr_data.data.current.rr}RR (${mmr_data.data.current.last_change})`);
})

app.listen(port, () => {
  console.log(`Valorant rank api app listening at http://localhost:${port}`);
});
