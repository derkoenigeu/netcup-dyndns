const API_URL = 'https://ccp.netcup.net/run/webservice/servers/endpoint.php?JSON';

/**
 * Sends a JSON-RPC request to the Netcup CCP API endpoint.
 *
 * @param {string} action - API action name (e.g. `'login'`, `'infoDnsRecords'`, `'updateDnsRecords'`).
 * @param {object} param - Request parameters passed as the `param` field of the JSON body.
 * @returns {Promise<object>} Parsed `responsedata` from the API response.
 * @throws {Error} On HTTP failure or when the API returns a non-2000 status code.
 *   API errors additionally expose a `netcupStatusCode` property on the thrown Error.
 */
async function apiCall(action, param) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, param }),
  });
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  if (data.statuscode !== 2000) {
    const err = new Error(`Netcup API [${data.statuscode}]: ${data.longmessage}`);
    err.netcupStatusCode = data.statuscode;
    throw err;
  }
  return data.responsedata;
}

/**
 * Authenticates against the Netcup API and returns a session ID.
 *
 * @param {string} apiKey - Netcup API key.
 * @param {string} apiPassword - Netcup API password.
 * @param {string} customerNumber - Netcup customer number.
 * @returns {Promise<string>} A fresh API session ID.
 */
async function doLogin(apiKey, apiPassword, customerNumber) {
  const data = await apiCall('login', {
    apikey: apiKey,
    apipassword: apiPassword,
    customernumber: customerNumber,
  });
  return data.apisessionid;
}

/**
 * Creates an authenticated Netcup API client with automatic session refresh.
 *
 * The client establishes a session on creation and transparently re-authenticates
 * when the session expires (Netcup status code 4001), so callers never need to
 * manage session lifecycle manually.
 *
 * @param {string} apiKey - Netcup API key.
 * @param {string} apiPassword - Netcup API password.
 * @param {string} customerNumber - Netcup customer number.
 * @returns {Promise<{ infoDnsRecords: (domain: string) => Promise<object[]>, updateDnsRecords: (domain: string, dnsrecords: object[]) => Promise<void> }>} Authenticated API client.
 */
export async function createNetcupClient(apiKey, apiPassword, customerNumber) {
  let sessionId = await doLogin(apiKey, apiPassword, customerNumber);

  /**
   * Executes an API call, retrying once with a fresh session if the session has expired.
   *
   * @template T
   * @param {(sessionId: string) => Promise<T>} fn
   * @returns {Promise<T>}
   */
  async function withRefresh(fn) {
    try {
      return await fn(sessionId);
    } catch (err) {
      if (err.netcupStatusCode === 4001) {
        sessionId = await doLogin(apiKey, apiPassword, customerNumber);
        return fn(sessionId);
      }
      throw err;
    }
  }

  return {
    /**
     * Retrieves all DNS records for a domain.
     *
     * @param {string} domainname - The domain to query (e.g. `'example.com'`).
     * @returns {Promise<object[]>} Array of DNS record objects from the Netcup API.
     */
    infoDnsRecords(domainname) {
      return withRefresh(sid =>
        apiCall('infoDnsRecords', {
          apikey: apiKey,
          customernumber: customerNumber,
          apisessionid: sid,
          domainname,
        }).then(data => data.dnsrecords)
      );
    },

    /**
     * Updates DNS records for a domain.
     *
     * @param {string} domainname - The domain to update (e.g. `'example.com'`).
     * @param {object[]} dnsrecords - Array of DNS record objects with updated `destination` values.
     * @returns {Promise<void>}
     */
    updateDnsRecords(domainname, dnsrecords) {
      return withRefresh(sid =>
        apiCall('updateDnsRecords', {
          apikey: apiKey,
          customernumber: customerNumber,
          apisessionid: sid,
          domainname,
          dnsrecordset: { dnsrecords },
        })
      );
    },
  };
}
