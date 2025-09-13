import { io, Socket } from 'socket.io-client';
import { NetworkConfig } from './NetworkConfig';
import { SessionManager } from './SessionManager';

export class NetworkService {
    private socket: Socket;
    private isConnected = false;
    private playerName = '';
    private networkConfig: NetworkConfig;
    private sessionManager: SessionManager;
    private reconnectTimeout: NodeJS.Timeout | null = null;

    constructor() {
        this.networkConfig = NetworkConfig.getInstance();
        this.sessionManager = SessionManager.getInstance();
        
        const backendUrl = this.networkConfig.getSocketUrl();
        console.log(`🔗 Connexion au serveur: ${backendUrl}`);
        
        this.socket = io(backendUrl, {
            transports: ['websocket', 'polling'],
            autoConnect: true // Se connecte automatiquement
        });

        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.socket.on('connect', () => {
            console.log('✅ Connecté au serveur');
            this.isConnected = true;
            this.sessionManager.setConnected(true);
            this.clearReconnectTimeout();
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Déconnecté du serveur');
            this.isConnected = false;
            this.sessionManager.setConnected(false);
            this.scheduleReconnection();
        });

        this.socket.on('connect_error', (error) => {
            console.error('Erreur de connexion:', error);
            this.sessionManager.setConnected(false);
            this.scheduleReconnection();
        });
    }
    
    
    private scheduleReconnection() {
        if (this.sessionManager.canReconnect()) {
            console.log(`🔄 Reconnexion dans 3 secondes... (tentative ${this.sessionManager['reconnectAttempts'] + 1})`);
            this.reconnectTimeout = setTimeout(() => {
                this.socket.connect();
            }, 3000);
        } else {
            console.log('❌ Nombre maximum de tentatives de reconnexion atteint');
        }
    }
    
    private clearReconnectTimeout() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    joinGame(playerName: string, reconnectData?: any) {
        this.playerName = playerName;
        
        // Si c'est une reconnexion, utiliser les données sauvegardées
        const joinData = reconnectData ? {
            roomId: 'default',
            playerName: playerName,
            reconnect: true,
            lastPosition: reconnectData.position,
            lastRotation: reconnectData.rotation
        } : {
            roomId: 'default',
            playerName: playerName
        };
        
        this.socket.emit('joinGame', joinData);
    }

    sendPlayerMove(position, rotation, isMoving, speed) {
        if (this.isConnected) {
            this.socket.emit('playerMove', {
                position: {
                    x: position.x,
                    y: position.y,
                    z: position.z
                },
                rotation: {
                    x: rotation.x,
                    y: rotation.y,
                    z: rotation.z
                },
                isMoving: isMoving ? 1 : 0,
                speed: speed
            });
            
            // Sauvegarder les données du joueur dans la session
            this.sessionManager.updatePlayerData({
                position: position,
                rotation: rotation,
                isMoving: isMoving,
                speed: speed
            });
        }
    }

    onPlayerJoined(callback) {
        this.socket.on('playerJoined', callback);
    }

    onPlayerDisconnected(callback) {
        this.socket.on('playerDisconnected', callback);
    }

    onPlayerMoved(callback) {
        this.socket.on('playerMoved', callback);
    }

    onExistingPlayers(callback) {
        this.socket.on('existingPlayers', callback);
    }

    disconnect() {
        this.clearReconnectTimeout();
        this.sessionManager.setConnected(false);
        this.socket.disconnect();
    }
    
    clearSession() {
        this.sessionManager.clearSession();
    }
    
    isSessionValid() {
        return this.sessionManager.hasValidSession();
    }

    getSocket() {
        return this.socket;
    }
}
