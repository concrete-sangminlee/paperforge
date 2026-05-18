export type OAuthProviderId = 'google' | 'github';

export interface OAuthProviderConfig {
  google?: { clientId: string; clientSecret: string };
  github?: { clientId: string; clientSecret: string };
}

function readPair(primaryId: string, primarySecret: string, legacyId: string, legacySecret: string) {
  const clientId = process.env[primaryId] || process.env[legacyId] || '';
  const clientSecret = process.env[primarySecret] || process.env[legacySecret] || '';
  return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}

export function getOAuthProviderConfig(): OAuthProviderConfig {
  return {
    google: readPair('AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'),
    github: readPair('AUTH_GITHUB_ID', 'AUTH_GITHUB_SECRET', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'),
  };
}

export function getEnabledOAuthProviders(): OAuthProviderId[] {
  const providers = getOAuthProviderConfig();
  return (Object.keys(providers) as OAuthProviderId[]).filter((provider) => providers[provider]);
}
