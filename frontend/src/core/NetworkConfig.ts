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
  
  // Détecter si on est en mode ngrok ou local
  public getBackendUrl(): string {
    const hostname = window.location.hostname;
    
    // Si on est sur ngrok, utiliser le même domaine pour le backend
    if (hostname.includes('ngrok.io') || hostname.includes('ngrok-free.app')) {
      return `${window.location.protocol}//${hostname}:3001`;
    }
    
    // Sinon, utiliser localhost
    return 'http://localhost:3001';
  }
  
  public getSocketUrl(): string {
    return this.getBackendUrl();
  }
  
  public isNgrok(): boolean {
    const hostname = window.location.hostname;
    return hostname.includes('ngrok.io') || hostname.includes('ngrok-free.app');
  }
}
