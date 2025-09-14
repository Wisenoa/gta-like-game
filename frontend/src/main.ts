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
    private game: Game;
    private inputManager: InputManager;
    private player: Player;
    private world: World;
    private networkService: NetworkService;
    private otherPlayersManager: OtherPlayersManager | null;
    private minimap: Minimap | null;
    private loginManager: LoginManager | null;
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
        
        // Initialiser de manière asynchrone
        this.init().catch(error => {
            console.error('❌ Erreur lors de l\'initialisation:', error);
        });
    }
    
    async init() {
        // Initialiser le jeu
        this.game.init();
        
        // Ajouter le monde (sera créé quand on recevra les données de carte)
        this.game.scene?.add(this.world.group);
        
        // Ajouter le joueur
        this.player.init(this.game.camera!, this.inputManager);
        this.game.scene?.add(this.player.group);
        
        // Initialiser le gestionnaire des autres joueurs
        this.otherPlayersManager = new OtherPlayersManager(this.game.scene!);
        
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
        
        // Récupérer automatiquement les données de carte du serveur
        console.log("🗺️ Récupération automatique des données de carte...");
        try {
            await this.loadMapFromServer();
        } catch (error) {
            console.error("❌ Erreur lors du chargement de la carte:", error);
        }
        
        // Configurer le mode debug
        this.inputManager.setDebugCallback(() => {
            this.world.toggleDebugMode();
        });
        
        // Configurer l'affichage des positions des routes
        this.inputManager.setRoadPositionsCallback(() => {
            this.world.showRoadPositions();
        });
        
        // Configurer le mode godmode
        this.inputManager.setGodmodeCallback(() => {
            this.player.toggleGodmode();
        });
        
        // Exposer la méthode de test des routes dans la console
        (window as any).testRoads = () => {
            this.world.testRoadCreation();
        };
        
        // Exposer une méthode pour forcer la carte locale avec positions différentes
        (window as any).forceLocalMap = () => {
            console.log("🔄 Forçage de la carte locale avec positions différentes...");
            this.world.forceLocalMap();
        };
        
        // Exposer une méthode pour demander les données de carte au serveur
        (window as any).requestServerMap = () => {
            console.log("🔄 Demande des données de carte au serveur...");
            this.networkService.requestMapData();
        };
        
        // Exposer une méthode pour diagnostiquer l'état des données
        (window as any).diagnoseMapData = () => {
            console.log("🔍 Diagnostic des données de carte...");
            this.world.diagnoseMapData();
        };
        
        // Exposer une méthode pour diagnostiquer la connexion au serveur
        (window as any).diagnoseConnection = () => {
            console.log("🔍 Diagnostic de la connexion au serveur...");
            console.log("- Socket connecté:", this.networkService.getSocket()?.connected);
            console.log("- Session valide:", this.networkService.isSessionValid());
            console.log("- URL du serveur:", this.networkService.getSocket()?.io?.uri);
        };
        
        // Exposer une méthode pour tester la connexion au serveur
        (window as any).testServerConnection = async () => {
            console.log("🧪 Test de connexion au serveur...");
            try {
                const response = await fetch('http://localhost:3002/api/health');
                console.log("✅ Serveur backend accessible:", response.status);
                const data = await response.json();
                console.log("📊 Données de santé:", data);
            } catch (error) {
                console.error("❌ Serveur backend inaccessible:", error);
            }
        };
        
        // Exposer une méthode pour récupérer les données de carte directement via HTTP
        (window as any).getMapViaHTTP = async () => {
            console.log("🧪 Récupération des données de carte via HTTP...");
            try {
                const response = await fetch('http://localhost:3002/api/map');
                console.log("✅ Données de carte récupérées:", response.status);
                const mapData = await response.json();
                console.log("📊 Données de carte:", mapData);
                console.log("📊 Nombre d'éléments:", mapData.elements?.length || 0);
                
                // Envoyer les données au World
                await this.world.receiveMapData(mapData);
                console.log("✅ Données de carte envoyées au World");
            } catch (error) {
                console.error("❌ Erreur lors de la récupération des données de carte:", error);
            }
        };
        
        // Exposer une méthode pour analyser les dimensions du modèle GLB
        (window as any).analyzeGLB = async () => {
            console.log("🔍 Analyse des dimensions du modèle GLB...");
            // Accéder au RoadManager via le World
            const roadManager = (this.world as any).roadManager;
            if (roadManager) {
                await roadManager.analyzeGLBDimensions();
            } else {
                console.error("❌ RoadManager non accessible");
            }
        };
        
        // Exposer une méthode pour régénérer la carte avec les nouvelles dimensions
        (window as any).regenerateMap = async () => {
            console.log("🔄 Régénération de la carte avec les nouvelles dimensions...");
            try {
                const response = await fetch('http://localhost:3002/api/map/regenerate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                console.log("✅ Carte régénérée:", response.status);
                const result = await response.json();
                console.log("📊 Résultat:", result);
                
                // Récupérer la nouvelle carte
                await (window as any).getMapViaHTTP();
            } catch (error) {
                console.error("❌ Erreur lors de la régénération de la carte:", error);
            }
        };
        
        // Exposer une méthode pour forcer l'utilisation des routes simples
        (window as any).forceSimpleRoads = () => {
            console.log("🔄 Forçage de l'utilisation des routes simples...");
            const roadManager = (this.world as any).roadManager;
            if (roadManager) {
                // Modifier temporairement la méthode createComplexRoad
                roadManager.createComplexRoad = async (element) => {
                    console.log("🔄 Utilisation forcée des routes simples");
                    return roadManager.createSimpleRoad(element);
                };
                console.log("✅ Routes simples activées");
            }
        };
        
        // Exposer une méthode pour recharger la carte avec les routes simples
        (window as any).reloadWithSimpleRoads = async () => {
            console.log("🔄 Rechargement de la carte avec les routes simples...");
            await (window as any).forceSimpleRoads();
            await (window as any).getMapViaHTTP();
        };
        
        // Exposer une méthode pour tester l'endpoint de santé
        (window as any).testHealth = async () => {
            console.log("🧪 Test de l'endpoint de santé...");
            try {
                const response = await fetch('http://localhost:3002/api/health');
                console.log("✅ Endpoint de santé:", response.status);
                const data = await response.json();
                console.log("📊 Données:", data);
            } catch (error) {
                console.error("❌ Erreur endpoint de santé:", error);
            }
        };
        
        // Exposer une méthode pour désactiver les routes simples et revenir au GLB
        (window as any).enableGLBRoads = () => {
            console.log("🔄 Activation des routes GLB...");
            const roadManager = (this.world as any).roadManager;
            if (roadManager) {
                // Restaurer la méthode originale
                roadManager.createComplexRoad = roadManager.createComplexRoad.bind(roadManager);
                console.log("✅ Routes GLB activées");
            } else {
                console.error("❌ RoadManager non trouvé");
            }
        };
        
        // Exposer une méthode pour tester les routes GLB
        (window as any).testGLBRoads = async () => {
            console.log("🧪 Test des routes GLB...");
            await (window as any).enableGLBRoads();
            await (window as any).getMapViaHTTP();
        };
        
        // Exposer une méthode pour régénérer la carte avec les nouvelles positions Y
        (window as any).regenerateMapWithNewY = async () => {
            console.log("🔄 Régénération de la carte avec les nouvelles positions Y...");
            await (window as any).regenerateMap();
        };
        
        // Exposer une méthode pour diagnostiquer les routes dans la scène
        (window as any).diagnoseScene = () => {
            console.log("🔍 Diagnostic de la scène...");
            
            // Vérifier si le monde existe
            if (!this.world) {
                console.error("❌ World n'est pas défini");
                return;
            }
            
            // Vérifier si le groupe existe
            if (!this.world.group) {
                console.error("❌ Group n'est pas défini");
                console.log("🔍 État du world:", {
                    isMapLoaded: this.world.isMapLoaded,
                    mapData: this.world.mapData ? "présent" : "absent",
                    group: this.world.group ? "présent" : "absent"
                });
                return;
            }
            
            const scene = this.world.group;
            const roads = scene.children.filter(child => child.name.includes('road'));
            console.log(`📊 Nombre de routes dans la scène: ${roads.length}`);
            
            roads.forEach((road, index) => {
                console.log(`🛣️ Route ${index + 1}:`, {
                    name: road.name,
                    position: road.position,
                    rotation: road.rotation,
                    scale: road.scale,
                    visible: road.visible,
                    children: road.children.length
                });
                
                // Vérifier les enfants
                road.children.forEach((child, childIndex) => {
                    console.log(`  📦 Enfant ${childIndex + 1}:`, {
                        type: child.type,
                        name: child.name,
                        position: child.position,
                        scale: child.scale,
                        visible: child.visible
                    });
                });
            });
        };
        
        // Exposer une méthode pour tester la création de routes
        (window as any).testRoadCreation = () => {
            console.log("🧪 Test de création de route...");
            
            // Voir tous les enfants du groupe
            console.log("🔍 Tous les enfants du groupe:", this.world.group.children.map(child => ({name: child.name, type: child.type})));
            
            // Créer une route de test
            const testElement = {
                type: "road",
                position: { x: 0, y: 0.1, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 18.9, y: 0.03, z: 13.0 },
                color: "#404040"
            };
            
            try {
                const roadManager = this.world.roadManager;
                const testRoad = roadManager.createSimpleRoad(testElement);
                console.log("🧪 Route de test créée:", testRoad);
                this.world.group.add(testRoad);
                console.log("✅ Route de test ajoutée au groupe");
                
                // Vérifier que la route est bien ajoutée
                console.log("🔍 Enfants après ajout:", this.world.group.children.map(child => ({name: child.name, type: child.type})));
            } catch (error) {
                console.error("❌ Erreur lors de la création de la route:", error);
            }
        };
        
        // Exposer une méthode pour voir les détails des enfants
        (window as any).inspectChildren = () => {
            console.log("🔍 Détails des premiers enfants:", this.world.group.children.slice(0, 5).map(child => ({
                name: child.name, 
                type: child.type, 
                position: child.position,
                visible: child.visible,
                children: child.children.length
            })));
            
            // Vérifier si le groupe est dans la scène principale
            console.log("🔍 Groupe dans la scène:", this.game.scene.children.includes(this.world.group));
            console.log("🔍 Nombre d'enfants dans la scène principale:", this.game.scene.children.length);
        };
        
        // Exposer une méthode pour inspecter les positions détaillées
        (window as any).inspectPositions = () => {
            console.log("🔍 Positions détaillées:", this.world.group.children.slice(0, 5).map(child => ({
                name: child.name, 
                position: {x: child.position.x, y: child.position.y, z: child.position.z},
                scale: {x: child.scale.x, y: child.scale.y, z: child.scale.z},
                children: child.children.map(c => ({
                    type: c.type,
                    position: {x: c.position.x, y: c.position.y, z: c.position.z},
                    scale: {x: c.scale.x, y: c.scale.y, z: c.scale.z}
                }))
            })));
            
            // Vérifier la position de la caméra
            console.log("📷 Position de la caméra:", {
                position: {x: this.game.camera.position.x, y: this.game.camera.position.y, z: this.game.camera.position.z},
                rotation: {x: this.game.camera.rotation.x, y: this.game.camera.rotation.y, z: this.game.camera.rotation.z}
            });
        };
        
        // Exposer une méthode pour tester un modèle GLB simple en position 0,0,0
        (window as any).testGLBAtOrigin = async () => {
            console.log("🧪 Test d'un modèle GLB en position 0,0,0...");
            
            try {
                // Charger le modèle GLB
                const model = await this.world.modelManager.loadModel('/models/low_road.glb');
                console.log("✅ Modèle GLB chargé:", model);
                
                if (model) {
                    // Le modèle est directement un Group, pas besoin de .scene
                    const modelClone = model.clone();
                    
                    // Positionner à l'origine
                    modelClone.position.set(0, 0, 0);
                    modelClone.rotation.set(0, 0, 0);
                    modelClone.scale.set(1, 1, 1);
                    
                    // Ajouter à la scène
                    this.game.scene.add(modelClone);
                    console.log("✅ Modèle GLB ajouté à la scène en position 0,0,0");
                    
                    // Retourner l'objet pour inspection
                    return modelClone;
                } else {
                    console.error("❌ Modèle GLB non valide");
                }
            } catch (error) {
                console.error("❌ Erreur lors du chargement du modèle GLB:", error);
            }
        };
        
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
            
            const testPlayerId = this.otherPlayersManager?.createTestPlayer(
                `TestPlayer${Math.floor(Math.random() * 1000)}`,
                testPosition
            );
            
            console.log(`🧪 Joueur de test créé: ${testPlayerId}`);
        };
        
        this.player.clearTestPlayers = () => {
            this.otherPlayersManager?.clearAllPlayers();
            console.log('🧹 Tous les joueurs de test supprimés');
        };
        
        // Configurer les événements réseau
        this.setupNetworkEvents();
        
        // Vérifier s'il y a une session valide avant de créer l'interface
        this.checkForValidSession();
        
        // Positionner la caméra
        this.game.camera?.position.set(0, 5, 10);
        
        // Masquer le loading
        const loadingElement = document.getElementById('loading');
        const uiElement = document.getElementById('ui');
        if (loadingElement) loadingElement.style.display = 'none';
        if (uiElement) uiElement.style.display = 'block';
        
        // Démarrer la boucle de jeu APRÈS avoir masqué le loading
        this.gameLoop();
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
                this.otherPlayersManager?.addPlayer(playerData);
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
            this.otherPlayersManager?.removePlayer(playerId);
            if (this.minimap) {
                this.minimap.removeOtherPlayer(playerId);
            }
        });
        
        // Mouvement d'un joueur
        this.networkService.onPlayerMoved((data) => {
            this.otherPlayersManager?.updatePlayer(
                data.playerId,
                data.position,
                data.rotation,
                data.isMoving,
                data.speed
            );
            // Mettre à jour la minimap pour les autres joueurs
            const player = this.otherPlayersManager?.getAllPlayers().find(p => p.id === data.playerId);
            if (player && this.minimap) {
                this.minimap.updateOtherPlayer(data.playerId, data.position, player.name);
            }
        });
        
        // Joueurs existants
        this.networkService.onExistingPlayers((players) => {
            console.log('Joueurs existants:', players);
            players.forEach(player => {
                this.otherPlayersManager?.addPlayer(player);
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
        this.networkService.onMapData(async (mapData) => {
            console.log('🗺️ Réception des données de carte:', mapData);
            await this.world.receiveMapData(mapData);
            // La carte sera créée automatiquement dans receiveMapData
        });
        
        // Fallback: si pas de données de carte après 5 secondes, créer une carte locale
        setTimeout(async () => {
            if (!this.world['isMapLoaded']) {
                console.log('⚠️ Pas de données de carte reçues, création d\'une carte locale...');
                await this.world['createLocalMap']();
                await this.world.create();
            }
        }, 5000);
    }
    
    gameLoop() {
        // Vérifier que le jeu est complètement initialisé
        if (!this.game.clock || !this.game.scene || !this.game.camera || !this.game.renderer) {
            console.warn('⚠️ Jeu pas encore complètement initialisé, attente...');
            requestAnimationFrame(() => this.gameLoop());
            return;
        }
        
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
        if (this.game.scene && this.game.camera) {
            this.game.renderer?.render(this.game.scene, this.game.camera);
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    updateUI() {
        // Mettre à jour les FPS
        const fps = Math.round(1 / this.game.clock.getDelta());
        const fpsElement = document.getElementById('fps');
        if (fpsElement) fpsElement.textContent = fps.toString();
        
        // Mettre à jour la position
        const pos = this.game.camera?.position;
        const positionElement = document.getElementById('position');
        if (pos && positionElement) {
            positionElement.textContent = 
                `X: ${pos.x.toFixed(1)}, Y: ${pos.y.toFixed(1)}, Z: ${pos.z.toFixed(1)}`;
        }
        
        // Mettre à jour le nombre de joueurs connectés
        const playerCount = this.otherPlayersManager ? 
            this.otherPlayersManager.getAllPlayers().length + 1 : 1;
        const playersElement = document.getElementById('players');
        if (playersElement) {
            playersElement.textContent = playerCount.toString();
        }
        
        // Mettre à jour la stamina
        const staminaElement = document.getElementById('stamina');
        if (staminaElement) {
            const stamina = Math.round(this.player.stamina);
            staminaElement.textContent = stamina.toString();
            
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
            healthElement.textContent = Math.round(healthPercentage).toString();
            
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
    
    // Méthode pour charger la carte depuis le serveur
    async loadMapFromServer(): Promise<void> {
        console.log("🗺️ Chargement de la carte depuis le serveur...");
        try {
            const response = await fetch('http://localhost:3002/api/map');
            if (response.ok) {
                const mapData = await response.json();
                console.log("✅ Données de carte récupérées:", mapData);
                await this.world.receiveMapData(mapData);
                console.log("✅ Carte chargée avec succès");
            } else {
                console.error("❌ Erreur HTTP:", response.status);
            }
        } catch (error) {
            console.error("❌ Erreur lors du chargement de la carte:", error);
        }
    }
}

// Démarrer le jeu
new Main();
