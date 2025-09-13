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
    private eventListenersSetup = false;
    
    // Callbacks pour les événements de jeu
    private playerJoinedCallback?: (data: any) => void;
    private playerDisconnectedCallback?: (data: any) => void;
    private playerMovedCallback?: (data: any) => void;
    private existingPlayersCallback?: (data: any) => void;
    private chatMessageCallback?: (data: any) => void;
    private serverNotificationCallback?: (data: any) => void;

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
        
        console.log('🎮 Envoi de joinGame:', joinData);
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

    sendChatMessage(message: string) {
        if (this.isConnected) {
            this.socket.emit('chatMessage', {
                message: message,
                playerName: this.playerName
            });
        }
    }
    
    onChatMessage(callback) {
        if (!this.eventListenersSetup) {
            console.log('🎮 Configuration des écouteurs d\'événements');
            this.setupGameEventListeners();
            this.eventListenersSetup = true;
        }
        
        this.chatMessageCallback = callback;
    }
    
    onServerNotification(callback) {
        if (!this.eventListenersSetup) {
            console.log('🎮 Configuration des écouteurs d\'événements');
            this.setupGameEventListeners();
            this.eventListenersSetup = true;
        }
        
        this.serverNotificationCallback = callback;
    }

    onPlayerJoined(callback) {
        console.log('🎮 Configuration du callback playerJoined');
        if (!this.eventListenersSetup) {
            console.log('🎮 Configuration des écouteurs d\'événements');
            this.setupGameEventListeners();
            this.eventListenersSetup = true;
        }
        
        // Stocker le callback pour les événements de jeu
        this.playerJoinedCallback = callback;
        console.log('✅ Callback playerJoined configuré');
    }

    onPlayerDisconnected(callback) {
        if (!this.eventListenersSetup) {
            console.log('🎮 Configuration des écouteurs d\'événements');
            this.setupGameEventListeners();
            this.eventListenersSetup = true;
        }
        
        this.playerDisconnectedCallback = callback;
    }

    onPlayerMoved(callback) {
        if (!this.eventListenersSetup) {
            console.log('🎮 Configuration des écouteurs d\'événements');
            this.setupGameEventListeners();
            this.eventListenersSetup = true;
        }
        
        this.playerMovedCallback = callback;
    }

    onExistingPlayers(callback) {
        if (!this.eventListenersSetup) {
            console.log('🎮 Configuration des écouteurs d\'événements');
            this.setupGameEventListeners();
            this.eventListenersSetup = true;
        }
        
        this.existingPlayersCallback = callback;
    }
    
    private setupGameEventListeners() {
        console.log('🔧 Configuration des écouteurs Socket.io...');
        
        this.socket.on('playerJoined', (data) => {
            console.log('📨 Événement playerJoined reçu:', data);
            this.playerJoinedCallback?.(data);
        });

        this.socket.on('playerDisconnected', (data) => {
            console.log('📨 Événement playerDisconnected reçu:', data);
            this.playerDisconnectedCallback?.(data);
        });

        this.socket.on('playerMoved', (data) => {
            this.playerMovedCallback?.(data);
        });

        this.socket.on('existingPlayers', (data) => {
            console.log('📨 Événement existingPlayers reçu:', data);
            this.existingPlayersCallback?.(data);
        });
        
        this.socket.on('chatMessage', (data) => {
            console.log('📨 Événement chatMessage reçu:', data);
            this.chatMessageCallback?.(data);
        });
        
        this.socket.on('serverNotification', (data) => {
            console.log('📨 Événement serverNotification reçu:', data);
            this.serverNotificationCallback?.(data);
        });
        
        console.log('✅ Écouteurs Socket.io configurés');
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
