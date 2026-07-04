import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const port = 8000;
const CACHE_REFRESH_MS = 30 * 60 * 1000;

const ids = { toto: "9c02ea8a-5e35-554d-a897-4119aec05228" };

const ids_inox = {
  GOTA: "e04a78a2-30f9-5099-a53e-8ca4fc2c5b9b",
  INOX: "a346b6db-9f93-5e42-9e5b-385dfcb016f7",
  JBZZ: "448ee3d3-ed15-5ecf-b529-37d2e980701d",
  SQUEEZIE: "4276236a-7f42-5e78-b99a-46099c0349c3",
};

const rankCache = new Map();

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

async function refreshRankCache() {
  const users = [...Object.entries(ids), ...Object.entries(ids_inox)];
  const refreshes = await Promise.allSettled(
    users.map(async ([name, puuid]) => {
      const mmr = await getMMR(puuid);
      return { name, mmr };
    }),
  );

  let hasSuccess = false;
  for (const refresh of refreshes) {
    if (refresh.status === "fulfilled") {
      hasSuccess = true;
      rankCache.set(refresh.value.name, refresh.value.mmr);
      continue;
    }

    const message =
      refresh.reason instanceof Error
        ? refresh.reason.message
        : String(refresh.reason);
    console.error(`Cache refresh failed for rank: ${message}`);
  }

  if (!hasSuccess && rankCache.size === 0) {
    throw new Error("Unable to fill rank cache");
  }
}

app.get("/toto", (req, res) => {
  const rank = rankCache.get("toto");
  if (!rank) {
    res.status(503).send("Rank cache unavailable");
    return;
  }

  res.send(rank);
});

app.get("/ranks", (req, res) => {
  for (const name of Object.keys(ids_inox)) {
    const rank = rankCache.get(name);
    res.write(`${name}: ${rank ?? "Rank cache unavailable"}\n`);
  }
  res.end();
});

refreshRankCache()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Initial rank cache refresh failed: ${message}`);
  })
  .finally(() => {
    setInterval(() => {
      refreshRankCache().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Scheduled rank cache refresh failed: ${message}`);
      });
    }, CACHE_REFRESH_MS);

    app.listen(port, () => {
      console.log(`Valorant rank api app listening at http://localhost:${port}`);
    });
  });
