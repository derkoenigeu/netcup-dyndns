import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createNetcupClient } from '../src/netcup.mjs';

const loginResponse = {
  statuscode: 2000,
  responsedata: { apisessionid: 'session-abc' },
};

const dnsRecordsResponse = {
  statuscode: 2000,
  responsedata: {
    dnsrecords: [
      { id: '1', hostname: '@', type: 'A', destination: '1.2.3.4' },
    ],
  },
};

const updateResponse = {
  statuscode: 2000,
  responsedata: {
    dnsrecords: [
      { id: '1', hostname: '@', type: 'A', destination: '5.6.7.8' },
    ],
  },
};

function mockResponse(data) {
  return { ok: true, json: async () => data };
}

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createNetcupClient', () => {
  it('logs in during initialization and sends correct payload', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(loginResponse));

    await createNetcupClient('my-key', 'my-pass', '99999');

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://ccp.netcup.net/run/webservice/servers/endpoint.php?JSON');
    const body = JSON.parse(options.body);
    expect(body).toEqual({
      action: 'login',
      param: { apikey: 'my-key', apipassword: 'my-pass', customernumber: '99999' },
    });
  });

  it('fetches DNS records and returns dnsrecords array', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse(loginResponse))
      .mockResolvedValueOnce(mockResponse(dnsRecordsResponse));

    const client = await createNetcupClient('my-key', 'my-pass', '99999');
    const records = await client.infoDnsRecords('example.com');

    expect(records).toEqual(dnsRecordsResponse.responsedata.dnsrecords);
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.action).toBe('infoDnsRecords');
    expect(body.param.domainname).toBe('example.com');
    expect(body.param.apisessionid).toBe('session-abc');
  });

  it('updates DNS records', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse(loginResponse))
      .mockResolvedValueOnce(mockResponse(updateResponse));

    const client = await createNetcupClient('my-key', 'my-pass', '99999');
    await client.updateDnsRecords('example.com', [{ id: '1', hostname: '@', type: 'A', destination: '5.6.7.8' }]);

    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.action).toBe('updateDnsRecords');
    expect(body.param.domainname).toBe('example.com');
    expect(body.param.dnsrecordset.dnsrecords[0].destination).toBe('5.6.7.8');
  });

  it('re-authenticates automatically on session expiry (statuscode 4001)', async () => {
    const sessionExpiredResponse = { statuscode: 4001, longmessage: 'Session expired' };
    const newLoginResponse = {
      statuscode: 2000,
      responsedata: { apisessionid: 'session-new' },
    };

    fetchMock
      .mockResolvedValueOnce(mockResponse(loginResponse))          // initial login → session-abc
      .mockResolvedValueOnce(mockResponse(sessionExpiredResponse)) // infoDnsRecords fails with 4001
      .mockResolvedValueOnce(mockResponse(newLoginResponse))       // re-login → session-new
      .mockResolvedValueOnce(mockResponse(dnsRecordsResponse));    // retry succeeds

    const client = await createNetcupClient('my-key', 'my-pass', '99999');
    const records = await client.infoDnsRecords('example.com');

    expect(records).toEqual(dnsRecordsResponse.responsedata.dnsrecords);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const retryBody = JSON.parse(fetchMock.mock.calls[3][1].body);
    expect(retryBody.param.apisessionid).toBe('session-new');
  });

  it('throws on non-session API errors without retrying', async () => {
    const serverError = { statuscode: 5001, longmessage: 'Internal server error' };
    fetchMock
      .mockResolvedValueOnce(mockResponse(loginResponse))
      .mockResolvedValueOnce(mockResponse(serverError));

    const client = await createNetcupClient('my-key', 'my-pass', '99999');
    await expect(client.infoDnsRecords('example.com')).rejects.toThrow('5001');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws on HTTP error responses', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse(loginResponse))
      .mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Service Unavailable' });

    const client = await createNetcupClient('my-key', 'my-pass', '99999');
    await expect(client.infoDnsRecords('example.com')).rejects.toThrow('503');
  });
});
