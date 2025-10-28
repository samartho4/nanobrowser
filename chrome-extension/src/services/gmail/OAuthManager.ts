/**
 * Gmail OAuth 2.0 Manager
 * Handles authentication flow, token management, and auto-refresh
 */

import { GmailAuthToken } from './types';
import { GmailStorageManager } from './StorageManager';
import { GMAIL_API_CONFIG, GMAIL_OAUTH_SCOPES, GMAIL_SERVICE_CONFIG, LOG_PREFIX } from './constants';

export class OAuthManager {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = chrome.identity.getRedirectURL();

    console.log(`${LOG_PREFIX.OAUTH} Initialized with client ID: ${clientId.substring(0, 20)}...`);
    console.log(`${LOG_PREFIX.OAUTH} Redirect URI: ${this.redirectUri}`);
  }

  /**
   * Start OAuth authentication flow
   */
  async startAuthFlow(): Promise<GmailAuthToken> {
    console.log(`${LOG_PREFIX.OAUTH} Starting OAuth flow...`);

    try {
      const authCode = await this.getAuthCode();
      console.log(`${LOG_PREFIX.OAUTH} Authorization code obtained`);

      const token = await this.exchangeCodeForToken(authCode);
      console.log(`${LOG_PREFIX.OAUTH} Token obtained successfully`);

      // Save token to storage
      await GmailStorageManager.saveToken(token);

      // Schedule automatic refresh
      this.scheduleTokenRefresh(token);

      return token;
    } catch (error) {
      console.error(`${LOG_PREFIX.OAUTH} OAuth flow failed:`, error);
      throw error;
    }
  }

  /**
   * Get authorization code from Google
   */
  private async getAuthCode(): Promise<string> {
    const authUrl = this.buildAuthUrl();

    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl,
          interactive: true,
        },
        redirectUrl => {
          if (chrome.runtime.lastError) {
            console.error(`${LOG_PREFIX.OAUTH} Web auth flow error:`, chrome.runtime.lastError.message);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!redirectUrl) {
            console.warn(`${LOG_PREFIX.OAUTH} OAuth cancelled by user`);
            reject(new Error('OAuth flow cancelled by user'));
            return;
          }

          try {
            const url = new URL(redirectUrl);
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');

            if (error) {
              console.error(`${LOG_PREFIX.OAUTH} OAuth error:`, error);
              reject(new Error(`OAuth error: ${error}`));
              return;
            }

            if (!code) {
              reject(new Error('No authorization code in redirect URL'));
              return;
            }

            console.log(`${LOG_PREFIX.OAUTH} Auth code extracted`);
            resolve(code);
          } catch (parseError) {
            console.error(`${LOG_PREFIX.OAUTH} Failed to parse redirect URL:`, parseError);
            reject(parseError);
          }
        },
      );
    });
  }

  /**
   * Build OAuth authorization URL
   */
  private buildAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: GMAIL_OAUTH_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
    });

    const url = `${GMAIL_API_CONFIG.OAUTH_AUTHORIZE_URL}?${params.toString()}`;
    console.log(`${LOG_PREFIX.OAUTH} Auth URL built`);

    return url;
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(code: string): Promise<GmailAuthToken> {
    try {
      console.log(`${LOG_PREFIX.OAUTH} Exchanging code for token...`);

      const response = await fetch(GMAIL_API_CONFIG.OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error_description || `Token exchange failed: ${response.statusText}`);
      }

      const data = await response.json();

      const token: GmailAuthToken = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      };

      console.log(`${LOG_PREFIX.OAUTH} Token exchange successful`);
      return token;
    } catch (error) {
      console.error(`${LOG_PREFIX.OAUTH} Token exchange failed:`, error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(token: GmailAuthToken): Promise<GmailAuthToken> {
    if (!token.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      console.log(`${LOG_PREFIX.OAUTH} Refreshing access token...`);

      const response = await fetch(GMAIL_API_CONFIG.OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: token.refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
        }).toString(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error_description || 'Token refresh failed');
      }

      const data = await response.json();

      const newToken: GmailAuthToken = {
        accessToken: data.access_token,
        refreshToken: token.refreshToken,
        expiresAt: Date.now() + data.expires_in * 1000,
      };

      // Save new token
      await GmailStorageManager.saveToken(newToken);

      // Reschedule refresh
      this.scheduleTokenRefresh(newToken);

      console.log(`${LOG_PREFIX.OAUTH} Token refreshed successfully`);
      return newToken;
    } catch (error) {
      console.error(`${LOG_PREFIX.OAUTH} Token refresh failed:`, error);
      throw error;
    }
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(token: GmailAuthToken): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Calculate time until refresh (5 minutes before expiration)
    const timeUntilExpiration = token.expiresAt - Date.now();
    const refreshIn = timeUntilExpiration - GMAIL_SERVICE_CONFIG.TOKEN_REFRESH_BUFFER;

    if (refreshIn > 0) {
      console.log(`${LOG_PREFIX.OAUTH} Token refresh scheduled in ${Math.round(refreshIn / 1000)} seconds`);

      this.refreshTimer = setTimeout(async () => {
        try {
          const currentToken = await GmailStorageManager.loadToken();
          if (currentToken && currentToken.refreshToken) {
            await this.refreshAccessToken(currentToken);
            console.log(`${LOG_PREFIX.OAUTH} Auto-refresh completed`);
          }
        } catch (error) {
          console.error(`${LOG_PREFIX.OAUTH} Auto-refresh failed:`, error);
        }
      }, refreshIn);
    } else {
      console.warn(`${LOG_PREFIX.OAUTH} Token already expired or expiring very soon`);
    }
  }

  /**
   * Revoke token (logout)
   */
  async revokeToken(token: GmailAuthToken): Promise<void> {
    try {
      console.log(`${LOG_PREFIX.OAUTH} Revoking token...`);

      await fetch(GMAIL_API_CONFIG.OAUTH_REVOKE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: token.accessToken,
        }).toString(),
      });

      // Clear refresh timer
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }

      console.log(`${LOG_PREFIX.OAUTH} Token revoked successfully`);
    } catch (error) {
      console.error(`${LOG_PREFIX.OAUTH} Token revocation failed:`, error);
      // Continue even if revocation fails
    }
  }

  /**
   * Check if token is valid
   */
  static isTokenValid(token: GmailAuthToken | null): boolean {
    if (!token) return false;
    return token.expiresAt > Date.now();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    console.log(`${LOG_PREFIX.OAUTH} OAuth manager destroyed`);
  }
}
