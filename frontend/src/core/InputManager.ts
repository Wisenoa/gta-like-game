export class InputManager {
    constructor() {
        this.keys = {};
        this.mouse = {
            x: 0,
            y: 0,
            deltaX: 0,
            deltaY: 0,
            isLocked: false
        };
        
        // Configuration de la sensibilité (style Call of Duty arcade)
        this.mouseSensitivity = 0.003; // Sensibilité élevée pour réactivité maximale
        this.invertY = false; // Contrôle naturel
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Clavier
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
            
            // Empêcher les comportements par défaut pour certaines touches
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
                event.preventDefault();
            }
        });
        
        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });
        
        // Souris avec améliorations
        document.addEventListener('mousemove', (event) => {
            if (this.mouse.isLocked) {
                // Appliquer la sensibilité directement
                this.mouse.deltaX = event.movementX * this.mouseSensitivity;
                this.mouse.deltaY = event.movementY * this.mouseSensitivity;
            }
        });
        
        // Clic pour verrouiller le curseur
        document.addEventListener('click', (event) => {
            if (!this.mouse.isLocked) {
                document.body.requestPointerLock();
            }
        });
        
        // Gestion du verrouillage du pointeur
        document.addEventListener('pointerlockchange', () => {
            this.mouse.isLocked = document.pointerLockElement === document.body;
        });
        
        // Gestion des erreurs de verrouillage
        document.addEventListener('pointerlockerror', () => {
            console.warn('Impossible de verrouiller le pointeur');
        });
        
        // Empêcher le menu contextuel
        document.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
        
        // Gestion de la perte de focus
        window.addEventListener('blur', () => {
            // Relâcher toutes les touches quand la fenêtre perd le focus
            this.keys = {};
        });
    }
    
    isKeyPressed(key) {
        return !!this.keys[key];
    }
    
    getMouseDelta() {
        const delta = { x: this.mouse.deltaX, y: this.mouse.deltaY };
        this.mouse.deltaX = 0;
        this.mouse.deltaY = 0;
        return delta;
    }
    
    setMouseSensitivity(sensitivity) {
        this.mouseSensitivity = Math.max(0.1, Math.min(3.0, sensitivity));
    }
    
    setInvertY(invert) {
        this.invertY = invert;
    }
    
    isMouseLocked() {
        return this.mouse.isLocked;
    }
    
    requestPointerLock() {
        if (!this.mouse.isLocked) {
            document.body.requestPointerLock();
        }
    }
    
    exitPointerLock() {
        if (this.mouse.isLocked) {
            document.exitPointerLock();
        }
    }
}
