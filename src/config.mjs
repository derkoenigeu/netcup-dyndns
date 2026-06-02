export function parseRecords(recordsStr) {
  return recordsStr.split(';').filter(Boolean).map(entry => {
    const colonIdx = entry.indexOf(':');
    if (colonIdx === -1) throw new Error(`Invalid RECORDS entry (missing ':'): "${entry}"`);
    const domain = entry.slice(0, colonIdx).trim();
    const hostnames = entry.slice(colonIdx + 1).split(',').map(h => h.trim()).filter(Boolean);
    if (!domain) throw new Error(`Invalid RECORDS entry (empty domain): "${entry}"`);
    if (hostnames.length === 0) throw new Error(`Invalid RECORDS entry (no hostnames): "${entry}"`);
    return { domain, hostnames };
  });
}

export function loadConfig(env = process.env) {
  const required = ['API_KEY', 'API_PASSWORD', 'API_USER', 'RECORDS', 'TOKEN'];
  for (const key of required) {
    if (!env[key]) throw new Error(`Missing required environment variable: ${key}`);
  }
  return {
    apiKey: env.API_KEY,
    apiPassword: env.API_PASSWORD,
    apiUser: env.API_USER,
    records: parseRecords(env.RECORDS),
    token: env.TOKEN,
    port: parseInt(env.PORT || '3000', 10),
  };
}
