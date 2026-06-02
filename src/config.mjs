/**
 * Parses the RECORDS environment variable into a structured list of DNS update targets.
 *
 * Format: `domain.com:sub1,sub2;other.com:@`
 * - Entries are separated by `;`
 * - Each entry maps a domain to one or more hostnames separated by `,`
 * - Use `@` as the hostname to target the root/apex record
 *
 * @param {string} recordsStr - Raw RECORDS string from the environment.
 * @returns {{ domain: string, hostnames: string[] }[]} Parsed DNS record targets.
 * @throws {Error} If any entry is malformed (missing colon, empty domain, or no hostnames).
 */
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

/**
 * Loads and validates the application configuration from environment variables.
 *
 * @param {NodeJS.ProcessEnv} [env=process.env] - Environment variable map (injectable for testing).
 * @returns {{ apiKey: string, apiPassword: string, apiUser: string, records: { domain: string, hostnames: string[] }[], token: string, port: number }} Validated configuration object.
 * @throws {Error} If any required environment variable is missing or RECORDS is malformed.
 */
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
