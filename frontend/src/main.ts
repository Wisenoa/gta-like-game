import * as THREE from 'three';
import { Game } from './core/Game';
import { InputManager } from './core/InputManager';
import { Player } from './game/Player';
import { World } from './game/World';
import { NetworkService } from './core/NetworkService';
import { OtherPlayersManager } from './game/OtherPlayersManager';
import { Minimap } from './game/Minimap';
import { LoginManager } from './core/LoginManager';

class Main {
    constructor() {
        this.game = new Game();
        this.inputManager = new InputManager();
        this.player = new Player();
        this.world = new World();
        this.networkService = new NetworkService();
        this.otherPlayersManager = null;
        this.minimap = null;
        this.loginManager = null;
        
        this.init();
    }
    
    async init() {
        // Initialiser le jeu
        await this.game.init();
        
        // Ajouter le monde
        this.world.create();
        this.game.scene.add(this.world.group);
        
        // Ajouter le joueur
        this.player.init(this.game.camera, this.inputManager);
        this.game.scene.add(this.player.group);
        
        // Initialiser le gestionnaire des autres joueurs
        this.otherPlayersManager = new OtherPlayersManager(this.game.scene);
        
        // Initialiser la minimap
        try {
            this.minimap = new Minimap();
        } catch (error) {
            console.error('Erreur lors de l\'initialisation de la minimap:', error);
            this.minimap = null;
        }
        
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
    
    setupNetworkEvents() {
        // Nouveau joueur connecté
        this.networkService.onPlayerJoined((playerData) => {
            console.log('Nouveau joueur:', playerData);
            this.otherPlayersManager.addPlayer(playerData);
            if (this.minimap) {
                this.minimap.updateOtherPlayer(playerData.id, playerData.position, playerData.name);
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
    }
    
    gameLoop() {
        const deltaTime = this.game.clock.getDelta();
        
        // Mettre à jour le joueur
        this.player.update(deltaTime);
        
        // Mettre à jour la minimap
        if (this.minimap) {
            this.minimap.updatePlayerPosition(this.player.position, this.player.rotation);
        }
        
        // Envoyer la position du joueur au serveur
        this.networkService.sendPlayerMove(
            this.player.position,
            this.player.rotation,
            this.player.isMoving,
            this.player.speed
        );
        
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
            `${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`;
        
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
    }
}

// Démarrer le jeu
new Main();
