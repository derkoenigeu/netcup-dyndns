import { Router } from 'express';
import { isIPv4 } from 'node:net';

/**
 * Creates the Express router for the DynDNS service.
 *
 * Route overview:
 * - `GET /health`  — Public health check. No authentication required. Returns `200 OK`.
 * - `GET /:ip?`    — Updates all configured DNS A records to the provided IPv4 address.
 *                    The IP can be passed as a path segment (`/1.2.3.4`) or as a query
 *                    parameter (`?ip=1.2.3.4`). Requires `Authorization: Bearer <TOKEN>`.
 *
 * @param {{ token: string, records: { domain: string, hostnames: string[] }[] }} config - App configuration.
 * @param {{ infoDnsRecords: Function, updateDnsRecords: Function }} client - Netcup API client.
 * @returns {import('express').Router} Configured Express router.
 */
export function createRouter(config, client) {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.status(200).send('OK');
  });

  router.use((req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${config.token}`) {
      res.status(401).send('Unauthorized');
      return;
    }
    next();
  });

  router.get('/:ip?', async (req, res) => {
    const ip = req.params.ip || req.query['ip'];
    if (!ip || !isIPv4(ip)) {
      res.status(400).send('Missing or invalid IPv4 address');
      return;
    }

    try {
      for (const { domain, hostnames } of config.records) {
        const remoteRecords = await client.infoDnsRecords(domain);
        for (const hostname of hostnames) {
          const toUpdate = remoteRecords.filter(r => r.hostname === hostname && r.type === 'A');
          for (const record of toUpdate) {
            await client.updateDnsRecords(domain, [{ ...record, destination: ip }]);
            console.log(`Updated ${domain}: ${hostname} → ${ip}`);
          }
        }
      }
      res.status(200).send('Update successful');
    } catch (error) {
      console.error('DNS update failed:', error.message);
      res.status(500).send('An error occurred!');
    }
  });

  return router;
}
