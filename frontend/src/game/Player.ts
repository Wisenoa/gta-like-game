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
    
    // Rotations séparées pour éviter les problèmes d'ordre (style Call of Duty)
    pitch: number;
    yaw: number;
    roll: number;
    
    // Quaternion pour un contrôle précis des rotations
    cameraQuaternion: THREE.Quaternion;
    
    // Paramètres de mouvement
    walkSpeed: number;
    runSpeed: number;
    sprintSpeed: number;
    jumpForce: number;
    gravity: number;
    isGrounded: boolean;
    isSprinting: boolean;
    isWalking: boolean;
    isMoving: boolean;
    speed: number;
    
    // Physique
    acceleration: number;
    friction: number;
    airFriction: number;
    
    // Sensibilité de la souris
    mouseSensitivity: number;
    mouseSmoothing: number;
    
    // Limites de rotation
    maxPitch: number;
    minPitch: number;
    
    // Stamina
    stamina: number;
    maxStamina: number;
    staminaDrain: number;
    staminaRegen: number;
    isStaminaDepleted: boolean;
    
    // Santé
    health: number;
    maxHealth: number;
    isAlive: boolean;
    isInvulnerable: boolean;
    invulnerabilityTime: number;
    deathTime: number;
    isDead: boolean;
    
    // Head bobbing
    headBobAmount: number;
    headBobSpeed: number;
    headBobTime: number;
    
    // Mesh du joueur
    playerMesh: THREE.Mesh;
    
    constructor() {
        this.group = new THREE.Group();
        this.camera = null;
        this.inputManager = null;
        
        // Propriétés du joueur
        this.position = new THREE.Vector3(0, 5, 0);
        this.velocity = new THREE.Vector3();
        this.rotation = new THREE.Euler();
        
        // Rotations séparées pour éviter les problèmes d'ordre (style Call of Duty)
        this.pitch = 0; // Rotation verticale (X)
        this.yaw = 0;   // Rotation horizontale (Y)
        this.roll = 0;  // Toujours 0 pour éviter l'inclinaison
        
        // Quaternion pour un contrôle précis des rotations
        this.cameraQuaternion = new THREE.Quaternion();
        
        // Paramètres de mouvement style Call of Duty
        this.walkSpeed = 4.5;
        this.runSpeed = 7.0;
        this.sprintSpeed = 9.0;
        this.jumpForce = 12;
        this.gravity = -25;
        this.isGrounded = false;
        this.isSprinting = false;
        this.isWalking = false;
        this.isMoving = false;
        this.speed = 0;
        
        // Physique réaliste
        this.acceleration = 15;
        this.friction = 8;
        this.airFriction = 2;
        
        // Sensibilité de la souris (style Call of Duty arcade)
        this.mouseSensitivity = 1.0; // Multiplicateur pour InputManager
        this.mouseSmoothing = 1.0; // Pas de smoothing pour réactivité maximale
        
        // Limites de rotation verticale (style Call of Duty)
        this.maxPitch = Math.PI / 2 - 0.05; // 89.95 degrés
        this.minPitch = -Math.PI / 2 + 0.05; // -89.95 degrés
        
        // Stamina pour le sprint
        this.stamina = 100;
        this.maxStamina = 100;
        this.staminaDrain = 30; // par seconde
        this.staminaRegen = 20; // par seconde
        this.isStaminaDepleted = false;
        
        // Santé du joueur
        this.health = 100;
        this.maxHealth = 100;
        this.isAlive = true;
        this.isInvulnerable = false;
        this.invulnerabilityTime = 0;
        this.deathTime = 0;
        this.isDead = false;
        
        // Head bobbing
        this.headBobAmount = 0.02;
        this.headBobSpeed = 8;
        this.headBobTime = 0;
    }
    
    init(camera, inputManager) {
        this.camera = camera;
        this.inputManager = inputManager;
        
        // Créer le corps du joueur (invisible mais pour la physique)
        const playerGeometry = new THREE.CapsuleGeometry(0.5, 1.8);
        const playerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0.3 
        });
        this.playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
        this.playerMesh.position.y = 0.9;
        this.group.add(this.playerMesh);
        
        // Positionner le joueur
        this.group.position.copy(this.position);
    }
    
    update(deltaTime) {
        // Si le joueur est mort, ne pas mettre à jour le mouvement
        if (this.isDead) {
            this.updateHealth(deltaTime);
            return;
        }
        
        this.handleInput(deltaTime);
        this.updatePhysics(deltaTime);
        this.updateHealth(deltaTime); // Mettre à jour la santé
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
        
        // Gestion du sprint et de la stamina
        this.handleSprint(deltaTime);
        
        // Mouvement WASD avec physique réaliste
        const moveVector = new THREE.Vector3();
        
        // Détection des touches de mouvement
        if (this.inputManager.isKeyPressed('KeyW')) {
            moveVector.z -= 1;
        }
        if (this.inputManager.isKeyPressed('KeyS')) {
            moveVector.z += 1;
        }
        if (this.inputManager.isKeyPressed('KeyA')) {
            moveVector.x -= 1;
        }
        if (this.inputManager.isKeyPressed('KeyD')) {
            moveVector.x += 1;
        }
        
        // Normaliser le vecteur de mouvement
        if (moveVector.length() > 0) {
            moveVector.normalize();
            this.isWalking = true;
            this.isMoving = true;
            
            // Appliquer la rotation de la caméra au mouvement
            const cameraDirection = new THREE.Vector3();
            if (this.camera) {
                this.camera.getWorldDirection(cameraDirection);
            }
            cameraDirection.y = 0;
            cameraDirection.normalize();
            
            const right = new THREE.Vector3();
            right.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
            
            const finalMove = new THREE.Vector3();
            finalMove.addScaledVector(cameraDirection, -moveVector.z);
            finalMove.addScaledVector(right, moveVector.x);
            
            // Déterminer la vitesse selon l'état
            let targetSpeed;
            if (this.isSprinting && !this.isStaminaDepleted) {
                targetSpeed = this.sprintSpeed;
            } else if (this.inputManager.isKeyPressed('ShiftLeft') || 
                      this.inputManager.isKeyPressed('ShiftRight')) {
                targetSpeed = this.runSpeed;
            } else {
                targetSpeed = this.walkSpeed;
            }
            
            // Appliquer l'accélération
            const targetVelocity = new THREE.Vector3(
                finalMove.x * targetSpeed,
                this.velocity.y,
                finalMove.z * targetSpeed
            );
            
            // Interpolation fluide vers la vitesse cible
            this.velocity.lerp(targetVelocity, this.acceleration * deltaTime);
            
            // Calculer la vitesse actuelle
            this.speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
            
        } else {
            this.isWalking = false;
            this.isSprinting = false;
            this.isMoving = false;
            
            // Appliquer la friction
            const friction = this.isGrounded ? this.friction : this.airFriction;
            this.velocity.x *= Math.pow(0.1, friction * deltaTime);
            this.velocity.z *= Math.pow(0.1, friction * deltaTime);
            
            // Calculer la vitesse actuelle
            this.speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        }
        
        // Contrôles de sensibilité (style Call of Duty arcade)
        if (this.inputManager.isKeyPressed('Equal') || this.inputManager.isKeyPressed('NumpadAdd')) {
            this.setMouseSensitivity(this.mouseSensitivity + 0.2); // Pas plus grand pour ajustement fin
        }
        if (this.inputManager.isKeyPressed('Minus') || this.inputManager.isKeyPressed('NumpadSubtract')) {
            this.setMouseSensitivity(this.mouseSensitivity - 0.2); // Pas plus grand pour ajustement fin
        }
        
        // Reset de la sensibilité avec la touche 0
        if (this.inputManager.isKeyPressed('Digit0') || this.inputManager.isKeyPressed('Numpad0')) {
            this.setMouseSensitivity(1.0);
        }
        
        // Contrôles de test pour la santé
        if (this.inputManager.isKeyPressed('KeyH')) {
            this.heal(10); // Soigner 10 HP
        }
        if (this.inputManager.isKeyPressed('KeyJ')) {
            this.takeDamage(20); // Infliger 20 dégâts
        }
        if (this.inputManager.isKeyPressed('KeyK')) {
            this.revive(); // Ressusciter
        }
        
        // Contrôles de test pour les autres joueurs
        if (this.inputManager.isKeyPressed('KeyT')) {
            // Créer un joueur de test
            this.createTestPlayer?.();
        }
        if (this.inputManager.isKeyPressed('KeyY')) {
            // Supprimer tous les joueurs de test
            this.clearTestPlayers?.();
        }
        
        // Saut amélioré
        if (this.inputManager.isKeyPressed('Space') && this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
        }
        
    }
    
    handleSprint(deltaTime) {
        // Gestion du sprint avec stamina
        const isSprintKeyPressed = this.inputManager.isKeyPressed('ShiftLeft') || 
                                  this.inputManager.isKeyPressed('ShiftRight');
        
        if (isSprintKeyPressed && this.isWalking && this.stamina > 0 && !this.isStaminaDepleted) {
            this.isSprinting = true;
            this.stamina -= this.staminaDrain * deltaTime;
            
            if (this.stamina <= 0) {
                this.stamina = 0;
                this.isStaminaDepleted = true;
                this.isSprinting = false;
            }
        } else {
            this.isSprinting = false;
            
            // Régénération de la stamina
            if (this.stamina < this.maxStamina) {
                this.stamina += this.staminaRegen * deltaTime;
                if (this.stamina >= this.maxStamina) {
                    this.stamina = this.maxStamina;
                    this.isStaminaDepleted = false;
                }
            }
        }
    }
    
    updatePhysics(deltaTime) {
        // Appliquer la gravité
        this.velocity.y += this.gravity * deltaTime;
        
        // Mettre à jour la position
        this.position.addScaledVector(this.velocity, deltaTime);
        
        // Collision avec le sol (simplifiée)
        if (this.position.y <= 0) {
            this.position.y = 0;
            this.velocity.y = 0;
            this.isGrounded = true;
        }
        
        // Mettre à jour la position du groupe
        this.group.position.copy(this.position);
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
        
        // Ajouter un léger effet de recul lors du saut
        if (!this.isGrounded && this.velocity.y < 0 && this.camera) {
            this.camera.position.y += this.velocity.y * 0.01;
        }
    }
    
    // Méthodes pour ajuster la sensibilité (style Call of Duty arcade)
    setMouseSensitivity(sensitivity) {
        this.mouseSensitivity = Math.max(0.1, Math.min(5.0, sensitivity)); // Plage étendue pour arcade
        if (this.inputManager) {
            this.inputManager.setMouseSensitivity(sensitivity * 0.003); // Sensibilité de base élevée
        }
    }
    
    getMouseSensitivity() {
        return this.mouseSensitivity;
    }
    
    setMouseSmoothing(smoothing) {
        // Pas de smoothing pour réactivité maximale (style arcade)
        this.mouseSmoothing = 1.0;
    }
    
    getMouseSmoothing() {
        return this.mouseSmoothing;
    }
    
    // Méthodes pour gérer la santé
    takeDamage(damage: number) {
        if (this.isInvulnerable || !this.isAlive || this.isDead) return;
        
        this.health -= damage;
        this.health = Math.max(0, this.health);
        
        // Déclencher l'invulnérabilité temporaire
        this.isInvulnerable = true;
        this.invulnerabilityTime = 1.0; // 1 seconde d'invulnérabilité
        
        // Vérifier si le joueur est mort
        if (this.health <= 0) {
            this.die();
        }
        
        console.log(`💔 Dégâts reçus: ${damage}, Santé restante: ${this.health}`);
    }
    
    die() {
        this.isAlive = false;
        this.isDead = true;
        this.deathTime = Date.now();
        
        // Arrêter le mouvement
        this.velocity.set(0, 0, 0);
        this.isWalking = false;
        this.isSprinting = false;
        
        console.log('💀 Joueur mort !');
        
        // Déclencher l'événement de mort
        this.onDeath?.();
    }
    
    onDeath?: () => void; // Callback pour la mort
    
    heal(amount: number) {
        if (!this.isAlive) return;
        
        this.health += amount;
        this.health = Math.min(this.maxHealth, this.health);
        
        console.log(`💚 Soins reçus: ${amount}, Santé actuelle: ${this.health}`);
    }
    
    revive() {
        this.health = this.maxHealth;
        this.isAlive = true;
        this.isDead = false;
        this.isInvulnerable = false;
        this.invulnerabilityTime = 0;
        this.deathTime = 0;
        
        console.log('🔄 Joueur ressuscité !');
        
        // Déclencher l'événement de résurrection
        this.onRevive?.();
    }
    
    onRevive?: () => void; // Callback pour la résurrection
    
    // Callbacks pour les joueurs de test
    createTestPlayer?: () => void;
    clearTestPlayers?: () => void;
    
    updateHealth(deltaTime: number) {
        // Gérer l'invulnérabilité temporaire
        if (this.isInvulnerable) {
            this.invulnerabilityTime -= deltaTime;
            if (this.invulnerabilityTime <= 0) {
                this.isInvulnerable = false;
            }
        }
        
        // Régénération lente de la santé si en vie et pas de dégâts récents
        if (this.isAlive && !this.isInvulnerable && this.health < this.maxHealth) {
            this.health += 5 * deltaTime; // 5 HP par seconde
            this.health = Math.min(this.maxHealth, this.health);
        }
    }
    
    getHealthPercentage(): number {
        return (this.health / this.maxHealth) * 100;
    }
}
