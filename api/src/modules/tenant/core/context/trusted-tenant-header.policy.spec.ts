import { allowsTrustedTenantHeaders } from './trusted-tenant-header.policy';

describe('allowsTrustedTenantHeaders', () => {
  it('allows when not production', () => {
    expect(
      allowsTrustedTenantHeaders({
        nodeEnv: 'test',
        tenantDevSecretEnv: undefined,
        tenantTrustedHeaderIpsEnv: undefined,
        clientIp: '1.1.1.1',
      }),
    ).toBe(true);
  });

  it('disallows production without secret env', () => {
    expect(
      allowsTrustedTenantHeaders({
        nodeEnv: 'production',
        tenantDevSecretEnv: '',
        headerXTenantDevSecret: 'x',
        clientIp: '127.0.0.1',
      }),
    ).toBe(false);
  });

  it('allows production with matching secret and no IP list', () => {
    expect(
      allowsTrustedTenantHeaders({
        nodeEnv: 'production',
        tenantDevSecretEnv: 's',
        headerXTenantDevSecret: 's',
        clientIp: '8.8.8.8',
      }),
    ).toBe(true);
  });

  it('requires IP in allowlist when set', () => {
    expect(
      allowsTrustedTenantHeaders({
        nodeEnv: 'production',
        tenantDevSecretEnv: 's',
        tenantTrustedHeaderIpsEnv: '127.0.0.1, 10.0.0.1',
        headerXTenantDevSecret: 's',
        clientIp: '10.0.0.1',
      }),
    ).toBe(true);

    expect(
      allowsTrustedTenantHeaders({
        nodeEnv: 'production',
        tenantDevSecretEnv: 's',
        tenantTrustedHeaderIpsEnv: '127.0.0.1',
        headerXTenantDevSecret: 's',
        clientIp: '192.168.1.1',
      }),
    ).toBe(false);
  });
});
