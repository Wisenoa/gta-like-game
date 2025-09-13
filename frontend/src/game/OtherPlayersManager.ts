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

        // Créer le mesh du joueur
        const playerGeometry = new THREE.CapsuleGeometry(0.5, 1.8);
        const playerMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x00ff00 // Vert pour les autres joueurs
        });
        const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
        
        // Créer un groupe pour le joueur
        const playerGroup = new THREE.Group();
        playerGroup.add(playerMesh);
        playerGroup.position.set(
            playerData.position.x,
            playerData.position.y,
            playerData.position.z
        );
        
        // Ajouter un nom au-dessus du joueur
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.fillStyle = 'white';
        context.font = '24px Arial';
        context.textAlign = 'center';
        context.fillText(playerData.name, canvas.width / 2, canvas.height / 2 + 8);
        
        const texture = new THREE.CanvasTexture(canvas);
        const nameMaterial = new THREE.SpriteMaterial({ map: texture });
        const nameSprite = new THREE.Sprite(nameMaterial);
        nameSprite.position.y = 2.5;
        nameSprite.scale.set(2, 0.5, 1);
        
        playerGroup.add(nameSprite);
        
        // Stocker les références
        this.players.set(playerData.id, {
            group: playerGroup,
            mesh: playerMesh,
            nameSprite: nameSprite,
            data: playerData
        });
        
        this.scene.add(playerGroup);
        console.log(`Joueur ${playerData.name} ajouté à la scène`);
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
            // Mettre à jour la position
            player.group.position.set(position.x, position.y, position.z);
            
            // Mettre à jour la rotation
            player.group.rotation.set(rotation.x, rotation.y, rotation.z);
            
            // Changer la couleur si le joueur bouge
            if (isMoving) {
                player.mesh.material.color.setHex(0x0088ff);
            } else {
                player.mesh.material.color.setHex(0x00ff00);
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

    clearAllPlayers() {
        this.players.forEach(player => {
            this.scene.remove(player.group);
        });
        this.players.clear();
    }
}
