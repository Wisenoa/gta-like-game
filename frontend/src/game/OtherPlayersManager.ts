import * as THREE from 'three';

export class OtherPlayersManager {
    constructor(scene) {
        this.scene = scene;
        this.players = new Map();
    }

    addPlayer(playerData) {
        if (this.players.has(playerData.id)) {
            return; // Joueur déjà présent
        }

        console.log(`🎮 Ajout du joueur: ${playerData.name} (ID: ${playerData.id})`);

        // Créer le mesh du joueur avec une couleur distinctive
        const playerGeometry = new THREE.CapsuleGeometry(0.5, 1.8);
        const playerMaterial = new THREE.MeshLambertMaterial({ 
            color: this.getPlayerColor(playerData.id),
            transparent: true,
            opacity: 0.8
        });
        const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
        
        // Ajouter un contour pour mieux voir le joueur
        const outlineGeometry = new THREE.CapsuleGeometry(0.55, 1.85);
        const outlineMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            transparent: true,
            opacity: 0.3
        });
        const outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
        
        // Créer un groupe pour le joueur
        const playerGroup = new THREE.Group();
        playerGroup.add(outlineMesh);
        playerGroup.add(playerMesh);
        playerGroup.position.set(
            playerData.position.x,
            playerData.position.y,
            playerData.position.z
        );
        
        // Ajouter un nom au-dessus du joueur
        const nameSprite = this.createNameSprite(playerData.name);
        playerGroup.add(nameSprite);
        
        // Ajouter une barre de santé au-dessus du joueur
        const healthBar = this.createHealthBar();
        playerGroup.add(healthBar);
        
        // Stocker les références
        this.players.set(playerData.id, {
            group: playerGroup,
            mesh: playerMesh,
            outline: outlineMesh,
            nameSprite: nameSprite,
            healthBar: healthBar,
            data: playerData
        });
        
        // Ajouter à la scène
        this.scene.add(playerGroup);
        
        console.log(`✅ Joueur ${playerData.name} ajouté à la scène`);
    }
    
    getPlayerColor(playerId) {
        // Générer une couleur basée sur l'ID du joueur
        const colors = [
            0xff6b6b, // Rouge
            0x4ecdc4, // Turquoise
            0x45b7d1, // Bleu
            0xf9ca24, // Jaune
            0xf0932b, // Orange
            0xeb4d4b, // Rouge foncé
            0x6c5ce7, // Violet
            0xa29bfe, // Violet clair
            0xfd79a8, // Rose
            0xfdcb6e  // Jaune clair
        ];
        
        // Utiliser l'ID pour sélectionner une couleur
        const colorIndex = playerId.charCodeAt(0) % colors.length;
        return colors[colorIndex];
    }
    
    createNameSprite(playerName) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Fond semi-transparent
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Texte du nom
        context.fillStyle = 'white';
        context.font = 'bold 24px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(playerName, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const nameMaterial = new THREE.SpriteMaterial({ map: texture });
        const nameSprite = new THREE.Sprite(nameMaterial);
        nameSprite.position.y = 2.8;
        nameSprite.scale.set(2.5, 0.6, 1);
        
        return nameSprite;
    }
    
    createHealthBar() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 16;
        
        // Fond de la barre
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Barre de santé verte
        context.fillStyle = '#4CAF50';
        context.fillRect(2, 2, canvas.width - 4, canvas.height - 4);
        
        const texture = new THREE.CanvasTexture(canvas);
        const healthMaterial = new THREE.SpriteMaterial({ map: texture });
        const healthSprite = new THREE.Sprite(healthMaterial);
        healthSprite.position.y = 2.2;
        healthSprite.scale.set(1.5, 0.2, 1);
        
        return healthSprite;
    }

    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            this.scene.remove(player.group);
            this.players.delete(playerId);
            console.log(`Joueur ${playerId} retiré de la scène`);
        }
    }

    updatePlayer(playerId, position, rotation, isMoving, speed) {
        const player = this.players.get(playerId);
        if (player) {
            // Mettre à jour la position avec interpolation pour un mouvement fluide
            player.group.position.lerp(new THREE.Vector3(position.x, position.y, position.z), 0.1);
            
            // Mettre à jour la rotation
            player.group.rotation.set(rotation.x, rotation.y, rotation.z);
            
            // Changer l'opacité si le joueur bouge (effet de "pulsation")
            if (isMoving) {
                player.mesh.material.opacity = 0.9;
                player.outline.material.opacity = 0.5;
            } else {
                player.mesh.material.opacity = 0.7;
                player.outline.material.opacity = 0.3;
            }
            
            // Mettre à jour les données
            player.data.position = position;
            player.data.rotation = rotation;
            player.data.isMoving = isMoving;
            player.data.speed = speed;
        }
    }

    getAllPlayers() {
        return Array.from(this.players.values()).map(p => p.data);
    }
    
    // Méthode pour créer des joueurs de test (pour le debug)
    createTestPlayer(name, position) {
        const testPlayerData = {
            id: `test-${Date.now()}`,
            name: name,
            position: position,
            rotation: { x: 0, y: 0, z: 0 },
            isMoving: false,
            speed: 0
        };
        
        this.addPlayer(testPlayerData);
        return testPlayerData.id;
    }
    
    // Méthode pour déplacer un joueur de test
    moveTestPlayer(playerId, newPosition) {
        const player = this.players.get(playerId);
        if (player) {
            player.group.position.set(newPosition.x, newPosition.y, newPosition.z);
            player.data.position = newPosition;
        }
    }

    clearAllPlayers() {
        this.players.forEach(player => {
            this.scene.remove(player.group);
        });
        this.players.clear();
    }
}
