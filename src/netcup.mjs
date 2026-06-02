const API_URL = 'https://ccp.netcup.net/run/webservice/servers/endpoint.php?JSON';

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

async function doLogin(apiKey, apiPassword, customerNumber) {
  const data = await apiCall('login', {
    apikey: apiKey,
    apipassword: apiPassword,
    customernumber: customerNumber,
  });
  return data.apisessionid;
}

export async function createNetcupClient(apiKey, apiPassword, customerNumber) {
  let sessionId = await doLogin(apiKey, apiPassword, customerNumber);

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
