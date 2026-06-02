import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createRouter } from '../src/routes.mjs';

const config = {
  token: 'test-token',
  records: [{ domain: 'example.com', hostnames: ['@', 'www'] }],
};

const mockClient = {
  infoDnsRecords: vi.fn(),
  updateDnsRecords: vi.fn(),
};

function makeApp() {
  const app = express();
  app.use(createRouter(config, mockClient));
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockClient.infoDnsRecords.mockResolvedValue([
    { id: '1', hostname: '@', type: 'A', destination: '0.0.0.0' },
    { id: '2', hostname: 'www', type: 'A', destination: '0.0.0.0' },
  ]);
  mockClient.updateDnsRecords.mockResolvedValue({});
});

describe('GET /health', () => {
  it('returns 200 without authentication', async () => {
    const res = await request(makeApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.text).toBe('OK');
  });

  it('returns 200 even with wrong token', async () => {
    const res = await request(makeApp())
      .get('/health')
      .set('Authorization', 'Bearer wrong');
    expect(res.status).toBe(200);
  });
});

describe('Auth middleware', () => {
  it('returns 401 with no Authorization header', async () => {
    const res = await request(makeApp()).get('/1.2.3.4');
    expect(res.status).toBe(401);
    expect(res.text).toBe('Unauthorized');
  });

  it('returns 401 with wrong token', async () => {
    const res = await request(makeApp())
      .get('/1.2.3.4')
      .set('Authorization', 'Bearer wrong-token');
    expect(res.status).toBe(401);
  });

  it('returns 401 with malformed Authorization (no Bearer prefix)', async () => {
    const res = await request(makeApp())
      .get('/1.2.3.4')
      .set('Authorization', 'test-token');
    expect(res.status).toBe(401);
  });
});

describe('GET /:ip — IP validation', () => {
  const auth = { Authorization: 'Bearer test-token' };

  it('returns 400 for missing IP (root path)', async () => {
    const res = await request(makeApp()).get('/').set(auth);
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-IP string in path', async () => {
    const res = await request(makeApp()).get('/not-an-ip').set(auth);
    expect(res.status).toBe(400);
  });

  it('returns 400 for out-of-range IPv4 octet', async () => {
    const res = await request(makeApp()).get('/256.0.0.1').set(auth);
    expect(res.status).toBe(400);
  });

  it('returns 400 for IPv6 address in query param', async () => {
    const res = await request(makeApp()).get('/').query({ ip: '::1' }).set(auth);
    expect(res.status).toBe(400);
  });

  it('accepts valid IPv4 in path', async () => {
    const res = await request(makeApp()).get('/1.2.3.4').set(auth);
    expect(res.status).toBe(200);
  });

  it('accepts valid IPv4 in query param', async () => {
    const res = await request(makeApp()).get('/').query({ ip: '1.2.3.4' }).set(auth);
    expect(res.status).toBe(200);
  });
});

describe('GET /:ip — DNS update logic', () => {
  const auth = { Authorization: 'Bearer test-token' };

  it('calls infoDnsRecords once per configured domain', async () => {
    await request(makeApp()).get('/5.6.7.8').set(auth);
    expect(mockClient.infoDnsRecords).toHaveBeenCalledOnce();
    expect(mockClient.infoDnsRecords).toHaveBeenCalledWith('example.com');
  });

  it('calls updateDnsRecords for each matching A record hostname', async () => {
    await request(makeApp()).get('/5.6.7.8').set(auth);
    expect(mockClient.updateDnsRecords).toHaveBeenCalledTimes(2);
    expect(mockClient.updateDnsRecords).toHaveBeenCalledWith(
      'example.com',
      [expect.objectContaining({ hostname: '@', destination: '5.6.7.8' })]
    );
    expect(mockClient.updateDnsRecords).toHaveBeenCalledWith(
      'example.com',
      [expect.objectContaining({ hostname: 'www', destination: '5.6.7.8' })]
    );
  });

  it('does not call updateDnsRecords when no matching A records exist', async () => {
    mockClient.infoDnsRecords.mockResolvedValueOnce([
      { id: '9', hostname: 'other', type: 'A', destination: '0.0.0.0' },
    ]);
    const res = await request(makeApp()).get('/5.6.7.8').set(auth);
    expect(res.status).toBe(200);
    expect(mockClient.updateDnsRecords).not.toHaveBeenCalled();
  });

  it('skips AAAA records even if hostname matches', async () => {
    mockClient.infoDnsRecords.mockResolvedValueOnce([
      { id: '1', hostname: '@', type: 'AAAA', destination: '::1' },
    ]);
    await request(makeApp()).get('/5.6.7.8').set(auth);
    expect(mockClient.updateDnsRecords).not.toHaveBeenCalled();
  });

  it('returns 500 and does not crash on API error', async () => {
    mockClient.infoDnsRecords.mockRejectedValueOnce(new Error('Network failure'));
    const res = await request(makeApp()).get('/5.6.7.8').set(auth);
    expect(res.status).toBe(500);
    expect(res.text).toBe('An error occurred!');
  });
});
