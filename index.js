import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const port = 8000;

let ids = { toto: "9c02ea8a-5e35-554d-a897-4119aec05228" };

let ids_inox = {
  GOTA: "e04a78a2-30f9-5099-a53e-8ca4fc2c5b9b",
  INOX: "a346b6db-9f93-5e42-9e5b-385dfcb016f7",
  JBZZ: "448ee3d3-ed15-5ecf-b529-37d2e980701d",
  SQUEEZIE: "4276236a-7f42-5e78-b99a-46099c0349c3",
};

async function fetchMMRByPuuid(puuid, authorization) {
  return fetch(
    `https://api.henrikdev.xyz/valorant/v3/by-puuid/mmr/eu/pc/${puuid}`,
    {
      method: "GET",
      headers: {
        Authorization: authorization,
        Accept: "*/*",
      },
    },
  );
}

async function getMMR(puuid) {
  const apiKey = process.env.API_KEY?.trim();
  if (!apiKey) {
    throw new Error("API_KEY is missing");
  }

  const authCandidates = apiKey.startsWith("Bearer ")
    ? [apiKey, apiKey.replace(/^Bearer\s+/i, "")]
    : [apiKey, `Bearer ${apiKey}`];

  let response;
  for (const authValue of [...new Set(authCandidates)]) {
    response = await fetchMMRByPuuid(puuid, authValue);
    if (response.status !== 401) {
      break;
    }
  }

  if (!response.ok) {
    throw new Error(`HenrikDev API error ${response.status}`);
  }

  const mmr_data = await response.json();
  const current = mmr_data?.data?.current;

  if (!current) {
    throw new Error("MMR data is missing current season information");
  }

  const diff_sign = Math.sign(current.last_change ?? 0) === 1 ? "+" : "";
  return `[${current.tier?.name ?? "Unknown tier"}]: ${current.rr ?? 0}RR (${diff_sign}${current.last_change ?? 0})`;
}

app.get("/toto", async (req, res) => {
  try {
    const mmr = await getMMR(ids.toto);
    res.send(mmr);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(502).send(message);
  }
});

app.get("/ranks", async (req, res) => {
  for (const [name, puuid] of Object.entries(ids_inox)) {
    try {
      const mmr = await getMMR(puuid);
      res.write(`${name}: ${mmr}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.write(`${name}: Error - ${message}\n`);
    }
  }
  res.end();
});

app.listen(port, () => {
  console.log(`Valorant rank api app listening at http://localhost:${port}`);
});
