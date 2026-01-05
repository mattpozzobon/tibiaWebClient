/**
 * API Endpoints utility class
 * Centralizes all API endpoint paths and URL building logic
 */
class ApiEndpoints {
  /**
   * Gets the base URL for API requests
   * Uses the same logic as network-manager for consistency
   */
  private static getBaseUrlInternal(): string {
    const host = process.env.SERVER_HOST;
    
    if (!host) {
      console.error("SERVER_HOST environment variable is not set!");
      return '';
    }
    
    const isLocal =
      host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
    
    if (isLocal) {
      return "http://127.0.0.1:1338";
    }
    
    // Non-local hosts use HTTPS
    return `https://${host}`;
  }

  /**
   * Builds a full URL for an API endpoint
   */
  private static buildUrl(endpoint: string): string {
    const baseUrl = this.getBaseUrlInternal();
    if (!baseUrl) {
      return '';
    }
    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${normalizedEndpoint}`;
  }

  // API Endpoint paths
  static readonly STATUS = '/api/status';
  static readonly CHARACTERS = '/characters';
  static readonly CHARACTERS_CREATE = '/characters/create';
  static readonly HANDSHAKE = '/';

  // Full URL builders
  static getStatusUrl(): string {
    return this.buildUrl(this.STATUS);
  }

  static getCharactersUrl(token: string): string {
    return `${this.buildUrl(this.CHARACTERS)}?token=${encodeURIComponent(token)}`;
  }

  static getCharactersCreateUrl(token: string): string {
    return `${this.buildUrl(this.CHARACTERS_CREATE)}?token=${encodeURIComponent(token)}`;
  }

  static getHandshakeUrl(token: string): string {
    return `${this.buildUrl(this.HANDSHAKE)}?token=${encodeURIComponent(token)}`;
  }

  /**
   * Get base URL (for cases where you need to build custom URLs)
   */
  static getBaseUrl(): string {
    return this.getBaseUrlInternal();
  }

  /**
   * Build URL from a custom host (for cases where server provides a different host)
   * This is used when loginHost from server response differs from SERVER_HOST
   */
  static buildUrlFromHost(host: string, endpoint: string): string {
    // Extract hostname (remove port if present for local check)
    const hostname = host.split(':')[0];
    
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local");
    
    const baseUrl = isLocal ? `http://${host}` : `https://${host}`;
    
    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${normalizedEndpoint}`;
  }
}

export default ApiEndpoints;
