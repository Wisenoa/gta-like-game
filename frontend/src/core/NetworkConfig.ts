// Configuration réseau pour le jeu
export class NetworkConfig {
  private static instance: NetworkConfig;
  
  private constructor() {}
  
  public static getInstance(): NetworkConfig {
    if (!NetworkConfig.instance) {
      NetworkConfig.instance = new NetworkConfig();
    }
    return NetworkConfig.instance;
  }
  
  // Configuration locale uniquement
  public getBackendUrl(): string {
    return 'http://localhost:3002';
  }
  
  public getSocketUrl(): string {
    return 'http://localhost:3002';
  }
  
  public isNgrok(): boolean {
    const hostname = window.location.hostname;
    return hostname.includes('ngrok.io') || hostname.includes('ngrok-free.app');
  }
}
