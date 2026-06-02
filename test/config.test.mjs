import { describe, it, expect } from 'vitest';
import { parseRecords, loadConfig } from '../src/config.mjs';

describe('parseRecords', () => {
  it('parses single domain with single hostname', () => {
    expect(parseRecords('example.com:@')).toEqual([
      { domain: 'example.com', hostnames: ['@'] },
    ]);
  });

  it('parses single domain with multiple hostnames', () => {
    expect(parseRecords('example.com:@,www')).toEqual([
      { domain: 'example.com', hostnames: ['@', 'www'] },
    ]);
  });

  it('parses multiple domains separated by semicolons', () => {
    expect(parseRecords('example.com:@;other.com:sub')).toEqual([
      { domain: 'example.com', hostnames: ['@'] },
      { domain: 'other.com', hostnames: ['sub'] },
    ]);
  });

  it('ignores trailing semicolons', () => {
    expect(parseRecords('example.com:@;')).toEqual([
      { domain: 'example.com', hostnames: ['@'] },
    ]);
  });

  it('throws on entry missing colon separator', () => {
    expect(() => parseRecords('example.com')).toThrow(/Invalid RECORDS/);
  });

  it('throws on empty domain', () => {
    expect(() => parseRecords(':hostname')).toThrow(/Invalid RECORDS/);
  });

  it('throws on empty hostname list', () => {
    expect(() => parseRecords('example.com:')).toThrow(/Invalid RECORDS/);
  });
});

describe('loadConfig', () => {
  const validEnv = {
    API_KEY: 'key123',
    API_PASSWORD: 'pass456',
    API_USER: '12345',
    RECORDS: 'example.com:@',
    TOKEN: 'secret-token',
    PORT: '8080',
  };

  it('returns parsed config from valid env', () => {
    const config = loadConfig(validEnv);
    expect(config).toEqual({
      apiKey: 'key123',
      apiPassword: 'pass456',
      apiUser: '12345',
      records: [{ domain: 'example.com', hostnames: ['@'] }],
      token: 'secret-token',
      port: 8080,
    });
  });

  it('defaults port to 3000 when PORT is not set', () => {
    const config = loadConfig({ ...validEnv, PORT: undefined });
    expect(config.port).toBe(3000);
  });

  it('throws with var name on missing API_KEY', () => {
    expect(() => loadConfig({ ...validEnv, API_KEY: '' })).toThrow('API_KEY');
  });

  it('throws with var name on missing API_PASSWORD', () => {
    expect(() => loadConfig({ ...validEnv, API_PASSWORD: undefined })).toThrow('API_PASSWORD');
  });

  it('throws with var name on missing TOKEN', () => {
    expect(() => loadConfig({ ...validEnv, TOKEN: '' })).toThrow('TOKEN');
  });

  it('throws with var name on missing RECORDS', () => {
    expect(() => loadConfig({ ...validEnv, RECORDS: undefined })).toThrow('RECORDS');
  });
});
