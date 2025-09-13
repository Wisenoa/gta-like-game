import * as THREE from 'three';

export class Minimap {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    private container: HTMLElement;
    private playerPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    private playerRotation: THREE.Euler = new THREE.Euler(0, 0, 0);
    private otherPlayers: Map<string, { position: THREE.Vector3, name: string }> = new Map();
    private worldBounds: { min: THREE.Vector3, max: THREE.Vector3 };
    
    constructor() {
        this.createMinimap();
        this.worldBounds = {
            min: new THREE.Vector3(-100, 0, -100),
            max: new THREE.Vector3(100, 0, 100)
        };
    }
    
    private createMinimap() {
        try {
            // Créer le conteneur
            this.container = document.createElement('div');
            this.container.style.cssText = `
                position: absolute;
                top: 20px;
                right: 20px;
                width: 200px;
                height: 200px;
                background: rgba(0, 0, 0, 0.7);
                border: 2px solid #333;
                border-radius: 10px;
                z-index: 1000;
                pointer-events: none;
            `;
            
            // Créer le canvas
            this.canvas = document.createElement('canvas');
            this.canvas.width = 200;
            this.canvas.height = 200;
            this.canvas.style.cssText = `
                width: 100%;
                height: 100%;
                border-radius: 8px;
            `;
            
            this.context = this.canvas.getContext('2d')!;
            if (!this.context) {
                throw new Error('Impossible de créer le contexte canvas');
            }
            
            this.container.appendChild(this.canvas);
            
            // Ajouter le titre
            const title = document.createElement('div');
            title.textContent = 'MINIMAP';
            title.style.cssText = `
                position: absolute;
                top: -25px;
                left: 0;
                color: white;
                font-size: 12px;
                font-weight: bold;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
            `;
            this.container.appendChild(title);
            
            // Ajouter au DOM
            const gameContainer = document.getElementById('gameContainer');
            if (!gameContainer) {
                throw new Error('Élément gameContainer non trouvé');
            }
            gameContainer.appendChild(this.container);
            
            // Dessiner la minimap initiale
            this.draw();
            
            console.log('✅ Minimap créée avec succès');
        } catch (error) {
            console.error('❌ Erreur lors de la création de la minimap:', error);
        }
    }
    
    public updatePlayerPosition(position: THREE.Vector3, rotation?: THREE.Euler) {
        this.playerPosition.copy(position);
        if (rotation) {
            this.playerRotation.copy(rotation);
        }
        this.draw();
    }
    
    public updateOtherPlayer(playerId: string, position: THREE.Vector3, name: string) {
        this.otherPlayers.set(playerId, { position: position.clone(), name });
        this.draw();
    }
    
    public removeOtherPlayer(playerId: string) {
        this.otherPlayers.delete(playerId);
        this.draw();
    }
    
    private draw() {
        if (!this.context || !this.canvas) {
            return;
        }
        
        const ctx = this.context;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Effacer le canvas
        ctx.clearRect(0, 0, width, height);
        
        // Dessiner le fond
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, width, height);
        
        // Dessiner la grille
        this.drawGrid();
        
        // Dessiner les éléments du monde
        this.drawWorldElements();
        
        // Dessiner les autres joueurs
        this.drawOtherPlayers();
        
        // Dessiner le joueur principal
        this.drawPlayer();
        
        // Dessiner la direction du joueur
        this.drawPlayerDirection();
    }
    
    private drawGrid() {
        const ctx = this.context;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        
        // Lignes verticales
        for (let i = 0; i <= 10; i++) {
            const x = (width / 10) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Lignes horizontales
        for (let i = 0; i <= 10; i++) {
            const y = (height / 10) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }
    
    private drawWorldElements() {
        const ctx = this.context;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Dessiner la route principale (centrée sur le joueur)
        ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
        const roadWidth = 30;
        const roadHeight = 200;
        const roadX = this.worldToMinimapX(0) - (roadWidth / 2);
        const roadY = this.worldToMinimapZ(0) - (roadHeight / 2);
        ctx.fillRect(roadX, roadY, roadWidth, roadHeight);
        
        // Dessiner les bâtiments (seulement ceux visibles dans la zone)
        ctx.fillStyle = 'rgba(150, 150, 150, 0.6)';
        const buildings = [
            { x: -45, z: -30, size: 15 },
            { x: -45, z: 30, size: 18 },
            { x: -60, z: 0, size: 10 },
            { x: -60, z: -60, size: 12 },
            { x: -60, z: 60, size: 14 },
            { x: 45, z: -30, size: 12 },
            { x: 45, z: 30, size: 16 },
            { x: 60, z: 0, size: 16 },
            { x: 60, z: -60, size: 10 },
            { x: 60, z: 60, size: 18 }
        ];
        
        buildings.forEach(building => {
            const x = this.worldToMinimapX(building.x);
            const y = this.worldToMinimapZ(building.z);
            
            // Ne dessiner que les bâtiments visibles dans la minimap
            if (x >= -20 && x <= width + 20 && y >= -20 && y <= height + 20) {
                const size = building.size / 4; // Réduire la taille pour la minimap
                ctx.fillRect(x - size/2, y - size/2, size, size);
            }
        });
        
        // Dessiner les trottoirs
        ctx.fillStyle = 'rgba(139, 115, 85, 0.6)';
        const sidewalkWidth = 8;
        const sidewalkHeight = 200;
        
        // Trottoir droit
        const rightSidewalkX = this.worldToMinimapX(19) - (sidewalkWidth / 2);
        const rightSidewalkY = this.worldToMinimapZ(0) - (sidewalkHeight / 2);
        ctx.fillRect(rightSidewalkX, rightSidewalkY, sidewalkWidth, sidewalkHeight);
        
        // Trottoir gauche
        const leftSidewalkX = this.worldToMinimapX(-19) - (sidewalkWidth / 2);
        const leftSidewalkY = this.worldToMinimapZ(0) - (sidewalkHeight / 2);
        ctx.fillRect(leftSidewalkX, leftSidewalkY, sidewalkWidth, sidewalkHeight);
    }
    
    private drawOtherPlayers() {
        const ctx = this.context;
        
        this.otherPlayers.forEach((player, playerId) => {
            const x = this.worldToMinimapX(player.position.x);
            const y = this.worldToMinimapZ(player.position.z);
            
            // Cercle pour les autres joueurs
            ctx.fillStyle = '#00FF00';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Bordure
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.stroke();
        });
    }
    
    private drawPlayer() {
        const ctx = this.context;
        // Le joueur est toujours au centre de la minimap
        const x = this.canvas.width / 2;
        const y = this.canvas.height / 2;
        
        // Cercle principal du joueur
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Bordure blanche
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    private drawPlayerDirection() {
        const ctx = this.context;
        // Le joueur est toujours au centre de la minimap
        const x = this.canvas.width / 2;
        const y = this.canvas.height / 2;
        
        // Calculer la direction basée sur la rotation Y du joueur
        const angle = this.playerRotation.y;
        const arrowLength = 8;
        
        // Calculer les coordonnées de la flèche
        const endX = x + Math.sin(angle) * arrowLength;
        const endY = y - Math.cos(angle) * arrowLength;
        
        // Dessiner la flèche
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        
        // Dessiner la pointe de la flèche
        const arrowAngle1 = angle + Math.PI * 0.8;
        const arrowAngle2 = angle - Math.PI * 0.8;
        const arrowLength2 = 3;
        
        const arrowX1 = endX + Math.sin(arrowAngle1) * arrowLength2;
        const arrowY1 = endY - Math.cos(arrowAngle1) * arrowLength2;
        const arrowX2 = endX + Math.sin(arrowAngle2) * arrowLength2;
        const arrowY2 = endY - Math.cos(arrowAngle2) * arrowLength2;
        
        ctx.moveTo(endX, endY);
        ctx.lineTo(arrowX1, arrowY1);
        ctx.moveTo(endX, endY);
        ctx.lineTo(arrowX2, arrowY2);
        
        ctx.stroke();
    }
    
    private worldToMinimapX(worldX: number): number {
        // Centrer sur la position du joueur
        const relativeX = worldX - this.playerPosition.x;
        const normalizedX = (relativeX + 50) / 100; // 50 unités de chaque côté du joueur
        return normalizedX * this.canvas.width;
    }
    
    private worldToMinimapZ(worldZ: number): number {
        // Centrer sur la position du joueur
        const relativeZ = worldZ - this.playerPosition.z;
        const normalizedZ = (relativeZ + 50) / 100; // 50 unités de chaque côté du joueur
        return normalizedZ * this.canvas.height;
    }
    
    public destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
