import * as THREE from 'three';

export interface PhysicsState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  onGround: boolean;
  jumping: boolean;
  running: boolean;
}

export interface CollisionResult {
  hasCollision: boolean;
  normal: THREE.Vector3;
  distance: number;
}

export class PhysicsManager {
  private gravity = -25; // Force de gravité (m/s²)
  private jumpForce = 12; // Force de saut
  private walkSpeed = 25; // Vitesse de marche (m/s) - ENCORE PLUS RAPIDE
  private runSpeed = 40; // Vitesse de course (m/s) - ENCORE PLUS RAPIDE
  private godmodeSpeed = 80; // Vitesse en mode godmode - ULTRA RAPIDE
  private friction = 0.9; // Friction au sol - RÉDUITE pour plus de fluidité
  private airFriction = 0.99; // Friction dans l'air - RÉDUITE
  
  private physicsState: PhysicsState = {
    position: new THREE.Vector3(0, 0, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    onGround: false,
    jumping: false,
    running: false
  };
  
  private inputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    run: false,
    godmode: false // Mode godmode
  };
  
  private worldBounds = {
    minX: -1000,
    maxX: 1000,
    minZ: -1000,
    maxZ: 1000,
    minY: -100,
    maxY: 200
  };
  
  constructor() {
    console.log('🎮 PhysicsManager initialisé');
  }
  
  // Mettre à jour la physique
  update(deltaTime: number, getBlockAt: (x: number, y: number, z: number) => string | null): void {
    const dt = Math.min(deltaTime, 1/30); // Limiter le deltaTime pour éviter les sauts
    
    // Appliquer la gravité
    this.applyGravity(dt);
    
    // Gérer le mouvement horizontal
    this.handleHorizontalMovement(dt);
    
    // Gérer le saut
    this.handleJump();
    
    // Appliquer la friction
    this.applyFriction(dt);
    
    // Mettre à jour la position AVANT les collisions
    this.updatePosition(dt);
    
    // Vérifier les collisions APRÈS la mise à jour de position
    this.checkCollisions(getBlockAt);
    
    // Limiter la vitesse
    this.limitVelocity();
  }
  
  // Appliquer la gravité
  private applyGravity(deltaTime: number): void {
    // Pas de gravité en mode godmode
    if (this.inputState.godmode) {
      return;
    }
    
    if (!this.physicsState.onGround) {
      this.physicsState.velocity.y += this.gravity * deltaTime;
    }
  }
  
  // Gérer le mouvement horizontal
  private handleHorizontalMovement(deltaTime: number): void {
    // Choisir la vitesse selon le mode
    let speed: number;
    if (this.inputState.godmode) {
      speed = this.godmodeSpeed; // Mode godmode ultra rapide
    } else if (this.inputState.run) {
      speed = this.runSpeed; // Course normale
    } else {
      speed = this.walkSpeed; // Marche normale
    }
    
    // Calculer la direction de mouvement
    const moveDirection = new THREE.Vector3(0, 0, 0);
    
    if (this.inputState.forward) moveDirection.z -= 1;
    if (this.inputState.backward) moveDirection.z += 1;
    if (this.inputState.left) moveDirection.x -= 1;
    if (this.inputState.right) moveDirection.x += 1;
    
    // En mode godmode, ajouter le mouvement vertical (vol)
    if (this.inputState.godmode) {
      if (this.inputState.jump) moveDirection.y += 1; // Vol vers le haut
      if (this.inputState.run) moveDirection.y -= 1; // Vol vers le bas (utilise Shift)
    }
    
    // Normaliser la direction
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      
      // Appliquer la vitesse avec accélération très rapide
      const acceleration = this.inputState.godmode ? 100 : (this.physicsState.onGround ? 50 : 30);
      const targetVelocity = moveDirection.multiplyScalar(speed);
      
      // Interpolation vers la vitesse cible (plus rapide)
      this.physicsState.velocity.x = THREE.MathUtils.lerp(this.physicsState.velocity.x, targetVelocity.x, acceleration * deltaTime);
      this.physicsState.velocity.z = THREE.MathUtils.lerp(this.physicsState.velocity.z, targetVelocity.z, acceleration * deltaTime);
      
      // En mode godmode, appliquer aussi le mouvement vertical
      if (this.inputState.godmode) {
        this.physicsState.velocity.y = THREE.MathUtils.lerp(this.physicsState.velocity.y, targetVelocity.y, acceleration * deltaTime);
      }
    }
  }
  
  // Gérer le saut
  private handleJump(): void {
    if (this.inputState.jump && this.physicsState.onGround && !this.physicsState.jumping) {
      this.physicsState.velocity.y = this.jumpForce;
      this.physicsState.jumping = true;
      this.physicsState.onGround = false;
    }
  }
  
  // Appliquer la friction
  private applyFriction(deltaTime: number): void {
    const friction = this.physicsState.onGround ? this.friction : this.airFriction;
    
    this.physicsState.velocity.x *= friction;
    this.physicsState.velocity.z *= friction;
    
    // Arrêter le saut si on touche le sol
    if (this.physicsState.onGround && this.physicsState.velocity.y <= 0) {
      this.physicsState.velocity.y = 0;
      this.physicsState.jumping = false;
    }
  }
  
  // Mettre à jour la position
  private updatePosition(deltaTime: number): void {
    this.physicsState.position.add(
      this.physicsState.velocity.clone().multiplyScalar(deltaTime)
    );
  }
  
  // Vérifier les collisions
  private checkCollisions(getBlockAt: (x: number, y: number, z: number) => string | null): void {
    const pos = this.physicsState.position;
    const vel = this.physicsState.velocity;
    
    // Collision avec le sol
    this.checkGroundCollision(pos, getBlockAt);
    
    // Collision avec les murs
    this.checkWallCollisions(pos, vel, getBlockAt);
    
    // Collision avec le plafond
    this.checkCeilingCollision(pos, getBlockAt);
  }
  
  // Vérifier la collision avec le sol
  private checkGroundCollision(pos: THREE.Vector3, getBlockAt: (x: number, y: number, z: number) => string | null): void {
    const groundY = this.getGroundHeight(pos.x, pos.z, getBlockAt);
    
    // Seulement appliquer la collision si on a trouvé un sol valide
    if (groundY > -50 && pos.y <= groundY + 1) {
      this.physicsState.position.y = groundY + 1;
      this.physicsState.velocity.y = 0; // Arrêter complètement la chute
      this.physicsState.onGround = true;
    } else {
      this.physicsState.onGround = false;
    }
  }
  
  // Vérifier les collisions avec les murs
  private checkWallCollisions(pos: THREE.Vector3, vel: THREE.Vector3, getBlockAt: (x: number, y: number, z: number) => string | null): void {
    const playerSize = 0.6; // Taille du joueur RÉDUITE pour éviter de rester coincé
    const margin = 0.2; // Marge de sécurité AUGMENTÉE
    
    // Collision X (mouvement horizontal)
    if (Math.abs(vel.x) > 0.1) {
      const nextX = pos.x + vel.x;
      const blockX = Math.floor(nextX + (vel.x > 0 ? playerSize : -playerSize));
      
      for (let y = Math.floor(pos.y); y < Math.floor(pos.y) + 2; y++) {
        for (let z = Math.floor(pos.z - playerSize); z <= Math.floor(pos.z + playerSize); z++) {
          const block = getBlockAt(blockX, y, z);
          if (this.isSolidBlock(block)) {
            this.physicsState.velocity.x = 0;
            this.physicsState.position.x = blockX - (vel.x > 0 ? playerSize + margin : -playerSize - margin);
            break;
          }
        }
      }
    }
    
    // Collision Z (mouvement vertical)
    if (Math.abs(vel.z) > 0.1) {
      const nextZ = pos.z + vel.z;
      const blockZ = Math.floor(nextZ + (vel.z > 0 ? playerSize : -playerSize));
      
      for (let y = Math.floor(pos.y); y < Math.floor(pos.y) + 2; y++) {
        for (let x = Math.floor(pos.x - playerSize); x <= Math.floor(pos.x + playerSize); x++) {
          const block = getBlockAt(x, y, blockZ);
          if (this.isSolidBlock(block)) {
            this.physicsState.velocity.z = 0;
            this.physicsState.position.z = blockZ - (vel.z > 0 ? playerSize + margin : -playerSize - margin);
            break;
          }
        }
      }
    }
  }
  
  // Vérifier la collision avec le plafond
  private checkCeilingCollision(pos: THREE.Vector3, getBlockAt: (x: number, y: number, z: number) => string | null): void {
    const playerHeight = 1.8; // Hauteur du joueur RÉDUITE
    const ceilingY = Math.floor(pos.y + playerHeight);
    
    for (let x = Math.floor(pos.x - 0.3); x <= Math.floor(pos.x + 0.3); x++) {
      for (let z = Math.floor(pos.z - 0.3); z <= Math.floor(pos.z + 0.3); z++) {
        const block = getBlockAt(x, ceilingY, z);
        if (this.isSolidBlock(block)) {
          this.physicsState.velocity.y = 0;
          this.physicsState.position.y = ceilingY - playerHeight;
          break;
        }
      }
    }
  }
  
  // Obtenir la hauteur du sol à une position
  private getGroundHeight(x: number, z: number, getBlockAt: (x: number, y: number, z: number) => string | null): number {
    // Chercher le premier bloc solide en descendant depuis une hauteur raisonnable
    for (let y = 50; y >= -100; y--) {
      const block = getBlockAt(Math.floor(x), y, Math.floor(z));
      // Ignorer les blocs null/undefined et les blocs AIR
      if (block && block !== 'air' && this.isSolidBlock(block)) {
        return y;
      }
    }
    return -100;
  }
  
  // Déterminer si un bloc est solide (pour les collisions)
  private isSolidBlock(blockType: string | null): boolean {
    if (!blockType) return false;
    
    const solidBlocks = [
      'stone', 'dirt', 'grass', 'wood', 'leaves', 'sand', 'snow', 'ice', 
      'clay', 'gravel', 'coal', 'iron', 'gold', 'diamond', 'bedrock',
      'road', 'building_wall', 'building_floor', 'building_roof'
    ];
    
    return solidBlocks.includes(blockType.toLowerCase());
  }

  // Limiter la vitesse
  private limitVelocity(): void {
    const maxSpeed = 50; // Vitesse maximale
    
    if (this.physicsState.velocity.length() > maxSpeed) {
      this.physicsState.velocity.normalize().multiplyScalar(maxSpeed);
    }
  }
  
  // Mettre à jour les entrées
  updateInput(input: Partial<typeof this.inputState>): void {
    Object.assign(this.inputState, input);
  }
  
  // Obtenir l'état de la physique
  getPhysicsState(): PhysicsState {
    return { ...this.physicsState };
  }
  
  // Définir la position du joueur
  setPosition(position: THREE.Vector3): void {
    this.physicsState.position.copy(position);
  }
  
  // Obtenir la position du joueur
  getPosition(): THREE.Vector3 {
    return this.physicsState.position.clone();
  }
  
  // Obtenir la vélocité du joueur
  getVelocity(): THREE.Vector3 {
    return this.physicsState.velocity.clone();
  }
  
  // Vérifier si le joueur est au sol
  isOnGround(): boolean {
    return this.physicsState.onGround;
  }
  
  // Vérifier si le joueur court
  isRunning(): boolean {
    return this.physicsState.running;
  }
  
  // Vérifier si le joueur saute
  isJumping(): boolean {
    return this.physicsState.jumping;
  }
}
