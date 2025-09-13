export class SessionManager {
    private static instance: SessionManager;
    private sessionData: any = null;
    private isConnected = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 3;
    
    private constructor() {
        this.loadSession();
    }
    
    public static getInstance(): SessionManager {
        if (!SessionManager.instance) {
            SessionManager.instance = new SessionManager();
        }
        return SessionManager.instance;
    }
    
    private loadSession() {
        try {
            const savedSession = localStorage.getItem('gta-session');
            if (savedSession) {
                this.sessionData = JSON.parse(savedSession);
                console.log('📦 Session chargée:', this.sessionData);
            }
        } catch (error) {
            console.error('Erreur lors du chargement de la session:', error);
            this.clearSession();
        }
    }
    
    public saveSession(playerData: any, connectionData?: any) {
        try {
            this.sessionData = {
                playerName: playerData.name,
                playerId: playerData.id,
                position: playerData.position,
                rotation: playerData.rotation,
                timestamp: Date.now(),
                connectionData: connectionData || null
            };
            
            localStorage.setItem('gta-session', JSON.stringify(this.sessionData));
            this.isConnected = true;
            console.log('💾 Session sauvegardée:', this.sessionData);
        } catch (error) {
            console.error('Erreur lors de la sauvegarde de la session:', error);
        }
    }
    
    public updatePlayerData(playerData: any) {
        if (this.sessionData) {
            this.sessionData.position = playerData.position;
            this.sessionData.rotation = playerData.rotation;
            this.sessionData.timestamp = Date.now();
            
            try {
                localStorage.setItem('gta-session', JSON.stringify(this.sessionData));
            } catch (error) {
                console.error('Erreur lors de la mise à jour de la session:', error);
            }
        }
    }
    
    public hasValidSession(): boolean {
        if (!this.sessionData) return false;
        
        // Vérifier si la session n'est pas trop ancienne (24 heures)
        const maxAge = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
        const sessionAge = Date.now() - this.sessionData.timestamp;
        
        return sessionAge < maxAge;
    }
    
    public getSessionData() {
        return this.sessionData;
    }
    
    public getPlayerName(): string | null {
        return this.sessionData?.playerName || null;
    }
    
    public getPlayerId(): string | null {
        return this.sessionData?.playerId || null;
    }
    
    public getLastPosition() {
        return this.sessionData?.position || null;
    }
    
    public getLastRotation() {
        return this.sessionData?.rotation || null;
    }
    
    public clearSession() {
        this.sessionData = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        
        try {
            localStorage.removeItem('gta-session');
            console.log('🗑️ Session effacée');
        } catch (error) {
            console.error('Erreur lors de l\'effacement de la session:', error);
        }
    }
    
    public setConnected(connected: boolean) {
        this.isConnected = connected;
        if (!connected) {
            this.reconnectAttempts++;
        } else {
            this.reconnectAttempts = 0;
        }
    }
    
    public canReconnect(): boolean {
        return this.reconnectAttempts < this.maxReconnectAttempts;
    }
    
    public shouldAutoReconnect(): boolean {
        return this.hasValidSession() && !this.isConnected && this.canReconnect();
    }
    
    public getReconnectData() {
        if (!this.shouldAutoReconnect()) return null;
        
        return {
            playerName: this.getPlayerName(),
            playerId: this.getPlayerId(),
            position: this.getLastPosition(),
            rotation: this.getLastRotation()
        };
    }
}
