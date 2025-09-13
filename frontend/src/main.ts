import * as THREE from 'three';
import { Game } from './core/Game';
import { InputManager } from './core/InputManager';
import { Player } from './game/Player';
import { World } from './game/World';
import { NetworkService } from './core/NetworkService';
import { OtherPlayersManager } from './game/OtherPlayersManager';
import { Minimap } from './game/Minimap';
import { LoginManager } from './core/LoginManager';
import { ChatManager } from './core/ChatManager';

class Main {
    private lastNetworkUpdate = 0;
    private networkTickRate = 1000 / 20; // 20 ticks par seconde (50ms)
    private chatManager: ChatManager | null = null;
    
    constructor() {
        this.game = new Game();
        this.inputManager = new InputManager();
        this.player = new Player();
        this.world = new World();
        this.networkService = new NetworkService();
        this.otherPlayersManager = null;
        this.minimap = null;
        this.loginManager = null;
        this.chatManager = null;
        
        this.init();
    }
    
    async init() {
        // Initialiser le jeu
        await this.game.init();
        
        // Ajouter le monde (sera créé quand on recevra les données de carte)
        this.game.scene.add(this.world.group);
        
        // Ajouter le joueur
        this.player.init(this.game.camera, this.inputManager);
        this.game.scene.add(this.player.group);
        
        // Initialiser le gestionnaire des autres joueurs
        this.otherPlayersManager = new OtherPlayersManager(this.game.scene);
        
        // Initialiser le chat
        this.chatManager = new ChatManager();
        
        // Initialiser la minimap
        try {
            this.minimap = new Minimap();
        } catch (error) {
            console.error('Erreur lors de l\'initialisation de la minimap:', error);
            this.minimap = null;
        }
        
        // Configurer les événements de mort du joueur
        this.player.onDeath = () => {
            this.showDeathScreen();
        };
        
        // Configurer le mode debug
        this.inputManager.setDebugCallback(() => {
            this.world.toggleDebugMode();
        });
        
        this.player.onRevive = () => {
            this.hideDeathScreen();
        };
        
        // Configurer les callbacks pour les joueurs de test
        this.player.createTestPlayer = () => {
            const testPosition = {
                x: this.player.position.x + (Math.random() - 0.5) * 10,
                y: this.player.position.y,
                z: this.player.position.z + (Math.random() - 0.5) * 10
            };
            
            const testPlayerId = this.otherPlayersManager.createTestPlayer(
                `TestPlayer${Math.floor(Math.random() * 1000)}`,
                testPosition
            );
            
            console.log(`🧪 Joueur de test créé: ${testPlayerId}`);
        };
        
        this.player.clearTestPlayers = () => {
            this.otherPlayersManager.clearAllPlayers();
            console.log('🧹 Tous les joueurs de test supprimés');
        };
        
        // Configurer les événements réseau
        this.setupNetworkEvents();
        
        // Vérifier s'il y a une session valide avant de créer l'interface
        this.checkForValidSession();
        
        // Positionner la caméra
        this.game.camera.position.set(0, 5, 10);
        
        // Démarrer la boucle de jeu
        this.gameLoop();
        
        // Masquer le loading
        document.getElementById('loading').style.display = 'none';
        document.getElementById('ui').style.display = 'block';
    }
    
    checkForValidSession() {
        // Vérifier s'il y a une session valide
        const sessionData = localStorage.getItem('gta-session');
        const playerName = localStorage.getItem('gta-player-name');
        
        console.log('🔍 Vérification de la session...');
        console.log('Session data:', sessionData);
        console.log('Player name:', playerName);
        
        if (sessionData && playerName) {
            try {
                const session = JSON.parse(sessionData);
                const maxAge = 24 * 60 * 60 * 1000; // 24 heures
                const sessionAge = Date.now() - session.timestamp;
                
                if (sessionAge < maxAge) {
                    console.log('🔄 Session valide trouvée, reconnexion automatique...');
                    
                    // Afficher un message de reconnexion
                    this.showReconnectionMessage(playerName);
                    
                    // Rejoindre automatiquement le jeu
                    setTimeout(() => {
                        this.networkService.joinGame(playerName, session);
                    }, 2000);
                    
                    return; // Ne pas créer l'interface de connexion
                } else {
                    console.log('⏰ Session expirée, nettoyage...');
                    localStorage.removeItem('gta-session');
                }
            } catch (error) {
                console.error('Erreur lors de la vérification de la session:', error);
                localStorage.removeItem('gta-session');
            }
        }
        
        // Créer l'interface de connexion normale
        this.loginManager = new LoginManager((playerName) => {
            this.networkService.joinGame(playerName);
        });
    }
    
    showReconnectionMessage(playerName: string) {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #1e3c72, #2a5298);
            color: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            border: 2px solid #4a90e2;
        `;
        
        messageDiv.innerHTML = `
            <h2 style="margin: 0 0 15px 0; font-size: 24px;">🔄 Reconnexion...</h2>
            <p style="margin: 0 0 10px 0; font-size: 16px;">Bon retour, <strong>${playerName}</strong> !</p>
            <p style="margin: 0; font-size: 14px; opacity: 0.8;">Connexion automatique en cours...</p>
        `;
        
        document.body.appendChild(messageDiv);
        
        // Supprimer le message après 3 secondes
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }
    
    showDeathScreen() {
        const deathScreen = document.getElementById('death-screen');
        const survivalTimeElement = document.getElementById('survival-time');
        const deathPositionElement = document.getElementById('death-position');
        
        if (deathScreen && survivalTimeElement && deathPositionElement) {
            // Calculer le temps de survie (approximatif)
            const survivalTime = Math.round((Date.now() - this.game.clock.startTime) / 1000);
            survivalTimeElement.textContent = survivalTime.toString();
            
            // Afficher la position de mort
            const pos = this.player.position;
            deathPositionElement.textContent = `${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`;
            
            // Afficher l'écran de mort
            deathScreen.style.display = 'flex';
            
            // Masquer l'UI normale
            const ui = document.getElementById('ui');
            if (ui) {
                ui.style.display = 'none';
            }
            
            // Configurer les boutons
            this.setupDeathScreenButtons();
            
            // Configurer les contrôles clavier
            this.setupDeathScreenControls();
        }
    }
    
    hideDeathScreen() {
        const deathScreen = document.getElementById('death-screen');
        const ui = document.getElementById('ui');
        
        if (deathScreen) {
            deathScreen.style.display = 'none';
        }
        
        if (ui) {
            ui.style.display = 'block';
        }
    }
    
    setupDeathScreenButtons() {
        const respawnBtn = document.getElementById('respawn-btn');
        const spectateBtn = document.getElementById('spectate-btn');
        
        if (respawnBtn) {
            respawnBtn.onclick = () => {
                this.player.revive();
            };
        }
        
        if (spectateBtn) {
            spectateBtn.onclick = () => {
                // Mode spectateur (pour l'instant, juste ressusciter)
                this.player.revive();
            };
        }
    }
    
    setupDeathScreenControls() {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 'r') {
                this.player.revive();
            } else if (event.key.toLowerCase() === 's') {
                // Mode spectateur (pour l'instant, juste ressusciter)
                this.player.revive();
            }
        };
        
        document.addEventListener('keydown', handleKeyPress);
        
        // Nettoyer l'événement quand l'écran de mort est fermé
        const originalHideDeathScreen = this.hideDeathScreen.bind(this);
        this.hideDeathScreen = () => {
            document.removeEventListener('keydown', handleKeyPress);
            originalHideDeathScreen();
        };
    }
    
    setupNetworkEvents() {
        console.log('🔧 DEBUG: Début de setupNetworkEvents');
        
        // Nouveau joueur connecté
        this.networkService.onPlayerJoined((playerData) => {
            console.log('Nouveau joueur:', playerData);
            
            // Si c'est notre propre joueur, mettre à jour la position
            if (playerData.id === this.player.id || playerData.name === this.networkService['playerName']) {
                console.log('🔄 Mise à jour de la position du joueur local:', playerData.position);
                
                // Mettre à jour l'ID du joueur si ce n'est pas encore fait
                if (!this.player.id) {
                    this.player.id = playerData.id;
                }
                
                this.player.group.position.set(
                    playerData.position.x,
                    playerData.position.y,
                    playerData.position.z
                );
                this.player.group.rotation.set(
                    playerData.rotation.x,
                    playerData.rotation.y,
                    playerData.rotation.z
                );
            } else {
                // C'est un autre joueur
                this.otherPlayersManager.addPlayer(playerData);
                if (this.minimap) {
                    this.minimap.updateOtherPlayer(playerData.id, playerData.position, playerData.name);
                }
            }
            
            // Sauvegarder les données de session
            this.networkService['sessionManager'].saveSession(playerData);
        });
        
        // Joueur déconnecté
        this.networkService.onPlayerDisconnected((playerId) => {
            console.log('Joueur déconnecté:', playerId);
            this.otherPlayersManager.removePlayer(playerId);
            if (this.minimap) {
                this.minimap.removeOtherPlayer(playerId);
            }
        });
        
        // Mouvement d'un joueur
        this.networkService.onPlayerMoved((data) => {
            this.otherPlayersManager.updatePlayer(
                data.playerId,
                data.position,
                data.rotation,
                data.isMoving,
                data.speed
            );
            // Mettre à jour la minimap pour les autres joueurs
            const player = this.otherPlayersManager.getAllPlayers().find(p => p.id === data.playerId);
            if (player && this.minimap) {
                this.minimap.updateOtherPlayer(data.playerId, data.position, player.name);
            }
        });
        
        // Joueurs existants
        this.networkService.onExistingPlayers((players) => {
            console.log('Joueurs existants:', players);
            players.forEach(player => {
                this.otherPlayersManager.addPlayer(player);
                if (this.minimap) {
                    this.minimap.updateOtherPlayer(player.id, player.position, player.name);
                }
            });
        });
        
        // Gestion de la fermeture de la page
        window.addEventListener('beforeunload', () => {
            this.networkService.disconnect();
        });
        
        // Gestion de la perte de focus
        window.addEventListener('blur', () => {
            // Optionnel : déconnecter quand la fenêtre perd le focus
            // this.networkService.disconnect();
        });
        
        // Configurer le chat
        this.setupChat();
    }
    
    setupChat() {
        if (!this.chatManager) return;
        
        // Configurer l'envoi de messages
        this.chatManager.setOnSendMessage((message: string) => {
            this.networkService.sendChatMessage(message);
        });
        
        // Écouter les messages de chat
        this.networkService.onChatMessage((data) => {
            this.chatManager!.addMessage(data.playerName, data.message, 'player');
        });
        
        // Écouter les notifications serveur
        this.networkService.onServerNotification((data) => {
            this.chatManager!.addServerNotification(data.message);
        });
        
        // Écouter les données de carte
        this.networkService.onMapData((mapData) => {
            console.log('🗺️ Réception des données de carte:', mapData);
            this.world.receiveMapData(mapData);
            // La carte sera créée automatiquement dans receiveMapData
        });
        
        // Fallback: si pas de données de carte après 5 secondes, créer une carte locale
        setTimeout(() => {
            if (!this.world['isMapLoaded']) {
                console.log('⚠️ Pas de données de carte reçues, création d\'une carte locale...');
                this.world['generateLocalMap']();
                this.world.create();
            }
        }, 5000);
    }
    
    gameLoop() {
        const deltaTime = this.game.clock.getDelta();
        
        // Mettre à jour le joueur
        this.player.update(deltaTime);
        
        // Mettre à jour la minimap
        if (this.minimap) {
            this.minimap.updatePlayerPosition(this.player.position, this.player.rotation);
        }
        
        // Envoyer la position du joueur au serveur (avec système de tick)
        const now = Date.now();
        if (now - this.lastNetworkUpdate >= this.networkTickRate) {
            // Ne pas envoyer si le joueur ne bouge pas et n'a pas bougé récemment
            if (this.player.isMoving || this.player.isWalking || this.player.isSprinting) {
                this.networkService.sendPlayerMove(
                    this.player.position,
                    this.player.rotation,
                    this.player.isMoving,
                    this.player.speed
                );
                this.lastNetworkUpdate = now;
            }
        }
        
        // Mettre à jour l'UI
        this.updateUI();
        
        // Rendre la scène
        this.game.renderer.render(this.game.scene, this.game.camera);
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    updateUI() {
        // Mettre à jour les FPS
        const fps = Math.round(1 / this.game.clock.getDelta());
        document.getElementById('fps').textContent = fps;
        
        // Mettre à jour la position
        const pos = this.game.camera.position;
        document.getElementById('position').textContent = 
            `X: ${pos.x.toFixed(1)}, Y: ${pos.y.toFixed(1)}, Z: ${pos.z.toFixed(1)}`;
        
        // Mettre à jour le nombre de joueurs connectés
        const playerCount = this.otherPlayersManager ? 
            this.otherPlayersManager.getAllPlayers().length + 1 : 1;
        const playersElement = document.getElementById('players');
        if (playersElement) {
            playersElement.textContent = playerCount;
        }
        
        // Mettre à jour la stamina
        const staminaElement = document.getElementById('stamina');
        if (staminaElement) {
            const stamina = Math.round(this.player.stamina);
            staminaElement.textContent = stamina;
            
            // Changer la couleur selon le niveau de stamina
            if (stamina < 20) {
                staminaElement.style.color = '#ff6b6b';
            } else if (stamina < 50) {
                staminaElement.style.color = '#ffa500';
            } else {
                staminaElement.style.color = '#4CAF50';
            }
        }
        
        // Mettre à jour la sensibilité
        const sensitivityElement = document.getElementById('sensitivity');
        if (sensitivityElement) {
            sensitivityElement.textContent = this.player.getMouseSensitivity().toFixed(1);
        }
        
        // Mettre à jour la santé
        const healthElement = document.getElementById('health');
        const healthBarElement = document.getElementById('health-bar');
        if (healthElement && healthBarElement) {
            const healthPercentage = this.player.getHealthPercentage();
            healthElement.textContent = Math.round(healthPercentage);
            
            // Mettre à jour la barre de vie
            healthBarElement.style.width = `${healthPercentage}%`;
            
            // Changer la couleur selon le niveau de santé
            if (healthPercentage < 25) {
                healthBarElement.style.background = 'linear-gradient(90deg, #f44336, #ff5722)'; // Rouge
                healthElement.style.color = '#f44336';
            } else if (healthPercentage < 50) {
                healthBarElement.style.background = 'linear-gradient(90deg, #ff9800, #ffc107)'; // Orange
                healthElement.style.color = '#ff9800';
            } else if (healthPercentage < 75) {
                healthBarElement.style.background = 'linear-gradient(90deg, #ffeb3b, #cddc39)'; // Jaune
                healthElement.style.color = '#ffeb3b';
            } else {
                healthBarElement.style.background = 'linear-gradient(90deg, #4CAF50, #8BC34A)'; // Vert
                healthElement.style.color = '#4CAF50';
            }
            
            // Effet de clignotement si le joueur est invulnérable
            if (this.player.isInvulnerable) {
                healthBarElement.style.opacity = '0.5';
                setTimeout(() => {
                    healthBarElement.style.opacity = '1';
                }, 100);
            }
        }
    }
}

// Démarrer le jeu
new Main();
