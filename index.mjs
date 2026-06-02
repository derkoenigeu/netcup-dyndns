import 'dotenv/config';
import express from 'express';
import { loadConfig } from './src/config.mjs';
import { createNetcupClient } from './src/netcup.mjs';
import { createRouter } from './src/routes.mjs';

const config = loadConfig();
const client = await createNetcupClient(config.apiKey, config.apiPassword, config.apiUser);

const app = express();
app.use(createRouter(config, client));

app.listen(config.port, () => {
  console.log(`DynDNS running on port ${config.port}`);
});
