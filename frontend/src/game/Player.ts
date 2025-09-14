import * as THREE from 'three';

export class Player {
    // Propriétés de base
    id: string | null = null;
    group: THREE.Group;
    camera: THREE.Camera | null;
    inputManager: any;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    rotation: THREE.Euler;
    
    // Référence au système de blocs pour synchroniser la position
    blockManager: any = null;
    
    // Rotations séparées pour éviter les problèmes d'ordre (style Call of Duty)
    pitch: number;
    yaw: number;
    roll: number;
    
    // Quaternion pour un contrôle précis des rotations
    cameraQuaternion: THREE.Quaternion;
    
    // Paramètres de mouvement style Call of Duty - SAUT RAPIDE ET NORMAL
    walkSpeed: number;
    runSpeed: number;
    jumpForce: number;
    isGrounded: boolean;
    isWalking: boolean;
    isMoving: boolean;
    speed: number;
    
    // Mode godmode
    isGodmode: boolean;
    godmodeSpeed: number;
    
    // Système de collision AABB (comme Minecraft)
    collisionBox: {
        width: number;
        height: number;
        depth: number;
    };
    
    // Mouvement simple (pas de friction complexe)
    moveSpeed: number;
    sprintSpeed: number;
    jumpSpeed: number;
    gravity: number;
    
    // Système de sprint et stamina
    stamina: number;
    maxStamina: number;
    staminaRegenRate: number;
    staminaDrainRate: number;
    isSprinting: boolean;
    
    // Sensibilité de la souris (style Call of Duty arcade)
    mouseSensitivity: number;
    mouseSmoothing: number;
    
    // Santé et dégâts
    maxHealth: number;
    currentHealth: number;
    isDead: boolean;
    isInvulnerable: boolean;
    
    // Head bobbing
    headBobAmount: number;
    headBobSpeed: number;
    headBobTime: number;
    
    // Limites de rotation
    minPitch: number;
    maxPitch: number;
    
    // Mesh du joueur
    playerMesh: THREE.Mesh;

    constructor() {
        this.group = new THREE.Group();
        this.camera = null;
        this.inputManager = null;
        
        // Propriétés du joueur
        // Position de spawn fixe
        this.position = new THREE.Vector3(0.5, 13, 0.5);
        this.velocity = new THREE.Vector3();
        this.rotation = new THREE.Euler();
        
        // Rotations séparées pour éviter les problèmes d'ordre (style Call of Duty)
        this.pitch = 0; // Rotation verticale (X)
        this.yaw = 0;   // Rotation horizontale (Y)
        this.roll = 0;  // Toujours 0 pour éviter l'inclinaison
        
        // Quaternion pour un contrôle précis des rotations
        this.cameraQuaternion = new THREE.Quaternion();
        
        // Paramètres de mouvement style Call of Duty - SAUT RAPIDE ET NORMAL
        this.walkSpeed = 12; // Plus rapide
        this.runSpeed = 18; // Plus rapide
        this.jumpForce = 15; // Force normale mais rapide
        this.isGrounded = false;
        this.isWalking = false;
        this.isMoving = false;
        this.speed = 0;
        
        // Mode godmode
        this.isGodmode = false;
        this.godmodeSpeed = 30.0; // Plus rapide en godmode
        
        // Système de collision AABB (comme Minecraft)
        this.collisionBox = {
            width: 0.6,   // Largeur du joueur
            height: 1.8, // Hauteur du joueur
            depth: 0.6   // Profondeur du joueur
        };
        
        // Mouvement simple (pas de friction complexe)
        this.moveSpeed = 12.0; // Vitesse encore plus rapide
        this.sprintSpeed = 18.0; // Vitesse de sprint (50% plus rapide)
        this.jumpSpeed = 7.0; // Force de saut (comme Minecraft)
        this.gravity = -20.0; // Gravité simple
        
        // Système de sprint et stamina
        this.stamina = 100; // Stamina actuelle
        this.maxStamina = 100; // Stamina maximale
        this.staminaRegenRate = 20; // Régénération par seconde
        this.staminaDrainRate = 30; // Déplétion par seconde en sprint
        this.isSprinting = false;
        
        // Sensibilité de la souris (style Call of Duty arcade)
        this.mouseSensitivity = 1.0; // Multiplicateur pour InputManager
        this.mouseSmoothing = 1.0; // Pas de smoothing pour réactivité maximale
        
        // Santé et dégâts
        this.maxHealth = 100;
        this.currentHealth = 100;
        this.isDead = false;
        this.isInvulnerable = false;
        
        // Head bobbing
        this.headBobAmount = 0.02;
        this.headBobSpeed = 8;
        this.headBobTime = 0;
        
        // Limites de rotation
        this.minPitch = -Math.PI / 2;
        this.maxPitch = Math.PI / 2;
    }
    
    init(camera, inputManager, blockManager = null) {
        this.camera = camera;
        this.inputManager = inputManager;
        this.blockManager = blockManager;
        
        // Créer le corps du joueur (invisible mais pour la physique)
        const playerGeometry = new THREE.CapsuleGeometry(0.5, 1.8);
        const playerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0.0 // Rendre le corps du joueur invisible
        });
        this.playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
        this.playerMesh.position.y = 0.9; // Positionner le mesh au centre de la capsule
        this.group.add(this.playerMesh);
        
        // Positionner le joueur
        this.group.position.copy(this.position);
    }
    
    update(deltaTime) {
        // Si le joueur est mort, ne pas mettre à jour le mouvement
        if (this.isDead) {
            return;
        }
        
        // Nouveau système de mouvement simple (comme Minecraft)
        this.handleInput(deltaTime);
        this.updateSimplePhysics(deltaTime);
        this.updateCamera();
    }
    
    handleInput(deltaTime) {
        // Rotation de la caméra (Call of Duty style)
        const mouseDelta = this.inputManager.getMouseDelta();
        
        // Rotation horizontale (Yaw) - gauche/droite
        this.yaw -= mouseDelta.x * this.mouseSensitivity;
        
        // Rotation verticale (Pitch) - haut/bas
        this.pitch -= mouseDelta.y * this.mouseSensitivity;
        
        // Limiter la rotation verticale pour éviter le retournement
        this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
        
        // Appliquer directement les rotations (ordre YXZ pour Call of Duty)
        if (this.camera) {
            this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
        }
        
        // Mouvement simple (comme Minecraft)
        const movementInput = this.inputManager.getMovementInput();
        
        // Calculer la direction du mouvement
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera!.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera!.quaternion);
        
        const moveDirection = new THREE.Vector3();
        if (movementInput.forward) moveDirection.add(forward);
        if (movementInput.backward) moveDirection.sub(forward);
        if (movementInput.left) moveDirection.sub(right);
        if (movementInput.right) moveDirection.add(right);
        
        moveDirection.normalize();
        
        // Gestion du sprint
        this.handleSprint(deltaTime);
        
        // Appliquer le mouvement horizontal (simple, pas de friction)
        if (moveDirection.lengthSq() > 0) {
            const currentSpeed = this.isSprinting ? this.sprintSpeed : this.moveSpeed;
            this.velocity.x = moveDirection.x * currentSpeed;
            this.velocity.z = moveDirection.z * currentSpeed;
        } else {
            this.velocity.x = 0;
            this.velocity.z = 0;
        }
        
        // Appliquer le saut
        if (movementInput.jump && this.isGrounded) {
            this.velocity.y = this.jumpSpeed;
            this.isGrounded = false;
        }
        
        // Mouvement vertical en godmode
        if (this.isGodmode) {
            if (movementInput.jump) { // Espace pour monter
                this.velocity.y = this.godmodeSpeed;
            } else if (movementInput.run) { // Shift pour descendre
                this.velocity.y = -this.godmodeSpeed;
            } else {
                this.velocity.y = 0; // Pas de gravité en godmode
            }
        }
        
        // Mettre à jour l'état de mouvement
        this.isMoving = moveDirection.lengthSq() > 0;
        this.isWalking = this.isMoving;
        this.speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    }
    
    handleSprint(deltaTime) {
        const movementInput = this.inputManager.getMovementInput();
        
        // Vérifier si le joueur veut sprinter (Shift + mouvement)
        const wantsToSprint = movementInput.run && movementInput.forward && this.stamina > 0;
        
        if (wantsToSprint) {
            // Commencer le sprint
            this.isSprinting = true;
            // Consommer la stamina
            this.stamina -= this.staminaDrainRate * deltaTime;
            this.stamina = Math.max(0, this.stamina);
        } else {
            // Arrêter le sprint
            this.isSprinting = false;
            // Régénérer la stamina
            this.stamina += this.staminaRegenRate * deltaTime;
            this.stamina = Math.min(this.maxStamina, this.stamina);
        }
        
        // Si la stamina est épuisée, forcer l'arrêt du sprint
        if (this.stamina <= 0) {
            this.isSprinting = false;
        }
    }
    
    // Nouveau système de physique simple (comme Minecraft)
    updateSimplePhysics(deltaTime) {
        if (this.isGodmode) {
            // En godmode, pas de gravité
            this.position.addScaledVector(this.velocity, deltaTime);
        } else {
            // Appliquer la gravité
            this.velocity.y += this.gravity * deltaTime;
            
            // Mouvement par axe (comme Minecraft)
            this.moveAxis('x', deltaTime);
            this.moveAxis('y', deltaTime);
            this.moveAxis('z', deltaTime);
        }
        
        // Mettre à jour la position du groupe
        this.group.position.copy(this.position);
    }
    
    // Mouvement par axe avec collision AABB (comme Minecraft)
    moveAxis(axis: 'x' | 'y' | 'z', deltaTime: number) {
        const oldPos = this.position[axis];
        this.position[axis] += this.velocity[axis] * deltaTime;
        
        // Vérifier les collisions pour cet axe
        if (this.checkCollision()) {
            // Collision détectée, annuler le mouvement
            this.position[axis] = oldPos;
            this.velocity[axis] = 0;
            
            // Si c'est l'axe Y et qu'on tombe, on est au sol
            if (axis === 'y' && this.velocity.y < 0) {
                this.isGrounded = true;
            }
        }
    }
    
    // Vérification de collision AABB optimisée (comme Minecraft)
    checkCollision(): boolean {
        if (!this.blockManager) return false;
        
        // Calculer les coins de la boîte de collision
        const minX = this.position.x - this.collisionBox.width / 2;
        const maxX = this.position.x + this.collisionBox.width / 2;
        const minY = this.position.y;
        const maxY = this.position.y + this.collisionBox.height;
        const minZ = this.position.z - this.collisionBox.depth / 2;
        const maxZ = this.position.z + this.collisionBox.depth / 2;
        
        // Vérifier seulement les blocs dans la zone de collision (optimisé)
        const startX = Math.floor(minX);
        const endX = Math.floor(maxX);
        const startY = Math.floor(minY);
        const endY = Math.floor(maxY);
        const startZ = Math.floor(minZ);
        const endZ = Math.floor(maxZ);
        
        // Vérifier les blocs dans la zone de collision
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                for (let z = startZ; z <= endZ; z++) {
                    const blockType = this.blockManager.getBlockAt(x, y, z);
                    if (blockType && blockType !== 'air') {
                        return true; // Collision détectée
                    }
                }
            }
        }
        
        return false; // Pas de collision
    }
    
    
    updateCamera() {
        // Positionner la caméra
        if (this.camera) {
            this.camera.position.copy(this.position);
            this.camera.position.y += 1.6; // Hauteur des yeux
        }
        
        // Head bobbing quand le joueur marche
        if (this.isWalking && this.isGrounded) {
            this.headBobTime += this.headBobSpeed * (this.isSprinting ? 1.5 : 1) * 0.016; // Approximation de deltaTime
            
            const bobX = Math.sin(this.headBobTime) * this.headBobAmount * (this.isSprinting ? 1.5 : 1);
            const bobY = Math.abs(Math.sin(this.headBobTime)) * this.headBobAmount * (this.isSprinting ? 1.5 : 1);
            
            if (this.camera) {
                this.camera.position.x += bobX;
                this.camera.position.y += bobY;
            }
        }
        
        // La rotation est maintenant appliquée directement dans handleInput
    }
    
    
    // Méthodes utilitaires pour la santé
    setMouseSensitivity(sensitivity: number): void {
        this.mouseSensitivity = sensitivity;
        if (this.inputManager) {
            this.inputManager.setMouseSensitivity(sensitivity);
        }
    }
    
    getMouseSensitivity(): number {
        return this.mouseSensitivity;
    }
    
    setMouseSmoothing(smoothing: number): void {
        this.mouseSmoothing = smoothing;
        if (this.inputManager) {
            this.inputManager.setMouseSmoothing(smoothing);
        }
    }
    
    getMouseSmoothing(): number {
        return this.mouseSmoothing;
    }
    
    // Méthodes pour les dégâts et la santé
    takeDamage(damage: number): void {
        if (this.isDead || this.isInvulnerable) return;
        
        this.currentHealth -= damage;
        if (this.currentHealth <= 0) {
            this.currentHealth = 0;
            this.die();
        }
    }
    
    die(): void {
        this.isDead = true;
        this.currentHealth = 0;
        this.velocity.set(0, 0, 0);
        this.isGrounded = false;
    }
    
    heal(amount: number): void {
        if (this.isDead) return;
        
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    }
    
    revive(): void {
        this.isDead = false;
        this.currentHealth = this.maxHealth;
        this.isInvulnerable = false;
    }
    
    // Méthodes de test
    createTestPlayer(): void {
        // Créer un joueur de test
    }
    
    clearTestPlayers(): void {
        // Supprimer tous les joueurs de test
    }
    
    // Méthodes pour obtenir des informations
    getHealthPercentage(): number {
        return (this.currentHealth / this.maxHealth) * 100;
    }
    
    // Méthodes pour le mode godmode
    toggleGodmode(): void {
        this.isGodmode = !this.isGodmode;
        if (this.isGodmode) {
            this.isInvulnerable = true;
            this.currentHealth = this.maxHealth;
        }
    }
}




