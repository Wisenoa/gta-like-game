import * as THREE from 'three';

export class Game {
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    clock: THREE.Clock;
    
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
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
        
        console.log('✅ Jeu initialisé avec succès');
    }
    
    setupLighting() {
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
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
