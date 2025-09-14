import * as THREE from 'three';
import { OptimizedBlockManager } from '../game/OptimizedBlockManager';
import { InputManager } from './InputManager';

export class Game {
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    clock: THREE.Clock;
    blockManager: OptimizedBlockManager | null;
    inputManager: InputManager | null;
    
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.blockManager = null;
        this.inputManager = null;
        this.clock = new THREE.Clock();
    }
    
    init() {
        console.log('🎮 Initialisation du jeu...');
        
        // Créer la scène
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Ciel bleu
        
        // Créer la caméra
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        
        // Créer le renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        
        // Ajouter le renderer au DOM
        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer) {
            gameContainer.appendChild(this.renderer.domElement);
        } else {
            console.error('❌ Élément gameContainer non trouvé !');
        }
        
        // Gérer le redimensionnement
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Ajouter l'éclairage
        this.setupLighting();
        
        // Initialiser le gestionnaire de blocs optimisé
        this.blockManager = new OptimizedBlockManager(this.scene);
        
        // Initialiser le gestionnaire d'entrées
        this.inputManager = new InputManager();
        
        // Charger les données du monde
        this.loadWorld();
        
        // Démarrer la boucle de rendu
        this.startRenderLoop();
        
        console.log('✅ Jeu initialisé avec succès');
    }
    
    startRenderLoop() {
        const animate = () => {
            requestAnimationFrame(animate);
            
            const deltaTime = this.clock.getDelta();
            
            // Mettre à jour la physique si les gestionnaires sont disponibles
            if (this.blockManager && this.inputManager && this.camera) {
                // Obtenir les entrées de mouvement
                // DÉSACTIVER complètement le système de blocs car le Player gère tout
                // const movementInput = this.inputManager.getMovementInput();
                // 
                // // Mettre à jour les entrées dans le gestionnaire de physique
                // this.blockManager.updatePlayerInput(movementInput);
                // 
                // // Mettre à jour la physique
                // this.blockManager.updatePhysics(deltaTime);
                
                // DÉSACTIVER complètement la gestion de caméra car le Player s'en occupe
                // Le Player gère la position ET la rotation de la caméra
            }
            
            // Rendre la scène
            if (this.scene && this.camera && this.renderer) {
                this.renderer.render(this.scene, this.camera);
            }
        };
        
        animate();
    }
    
    setupLighting() {
        if (!this.scene) return;
        
        // Lumière ambiante plus forte pour voir les textures
        const ambientLight = new THREE.AmbientLight(0x606060, 2.0);
        this.scene.add(ambientLight);
        
        // Lumière directionnelle (soleil) plus forte
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);
        
        // Lumière supplémentaire pour éclairer le sol
        const groundLight = new THREE.DirectionalLight(0xffffff, 0.8);
        groundLight.position.set(0, 30, 0);
        groundLight.target.position.set(0, 0, 0);
        this.scene.add(groundLight);
        this.scene.add(groundLight.target);
        
        // Lumière hémisphérique pour un éclairage plus naturel
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x8B4513, 0.6);
        this.scene.add(hemisphereLight);
    }
    
    async loadWorld() {
        if (this.blockManager) {
            console.log('🌍 Chargement du monde...');
            await this.blockManager.loadWorldData();
            
            // Initialiser la position du joueur avec la position de spawn
            const spawnPosition = await this.blockManager.getSpawnPosition();
            if (spawnPosition) {
                // Charger le chunk de spawn
                const spawnChunkX = Math.floor(spawnPosition.x / 16);
                const spawnChunkZ = Math.floor(spawnPosition.z / 16);
                await this.blockManager.loadChunkFaces(spawnChunkX, spawnChunkZ);
                
                // Initialiser la position du joueur - FORCER une position TRÈS HAUTE
                const playerPos = new THREE.Vector3(0.5, 50, 0.5); // Position FORCÉE, ignore complètement spawnPosition
                this.blockManager.setPlayerPosition(playerPos);
                
                console.log(`🎮 Joueur initialisé à: (${playerPos.x}, ${playerPos.y}, ${playerPos.z})`);
                
                // FORCER la caméra à la position initiale
                this.camera.position.set(playerPos.x, playerPos.y + 1.8, playerPos.z);
                console.log(`📷 Caméra forcée à: (${this.camera.position.x}, ${this.camera.position.y}, ${this.camera.position.z})`);
            }
        }
    }
    
    onWindowResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
    
    dispose() {
        if (this.blockManager) {
            this.blockManager.dispose();
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}
