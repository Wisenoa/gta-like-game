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
    const protocol = window.location.protocol;
    
    // Si on est sur ngrok (HTTPS), utiliser le même domaine
    if (hostname.includes('ngrok.io') || hostname.includes('ngrok-free.app')) {
      // Pour ngrok, utiliser le même domaine (le proxy Vite gérera le routage)
      return `${protocol}//${hostname}`;
    }
    
    // Sinon, utiliser localhost pour les tests locaux
    return 'http://localhost:3002';
  }
  
  public getSocketUrl(): string {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Si on est sur ngrok, utiliser le même domaine pour Socket.io
    if (hostname.includes('ngrok.io') || hostname.includes('ngrok-free.app')) {
      return `${protocol}//${hostname}`;
    }
    
    // Sinon, utiliser localhost
    return 'http://localhost:3002';
  }
  
  public isNgrok(): boolean {
    const hostname = window.location.hostname;
    return hostname.includes('ngrok.io') || hostname.includes('ngrok-free.app');
  }
}
