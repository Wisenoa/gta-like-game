export class LoginManager {
    private container: HTMLElement;
    private input: HTMLInputElement;
    private button: HTMLButtonElement;
    private onLogin: (name: string) => void;

    constructor(onLogin: (name: string) => void) {
        this.onLogin = onLogin;
        this.createLoginInterface();
    }

    private createLoginInterface() {
        // Créer le conteneur principal
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;

        // Créer la boîte de connexion
        const loginBox = document.createElement('div');
        loginBox.style.cssText = `
            background: linear-gradient(135deg, #1e3c72, #2a5298);
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            text-align: center;
            min-width: 300px;
            border: 2px solid #4a90e2;
        `;

        // Titre
        const title = document.createElement('h2');
        title.textContent = '🎮 GTA-Like Game';
        title.style.cssText = `
            color: white;
            margin: 0 0 20px 0;
            font-size: 24px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        `;

        // Sous-titre
        const subtitle = document.createElement('p');
        subtitle.textContent = 'Entrez votre nom de joueur';
        subtitle.style.cssText = `
            color: #b8d4f0;
            margin: 0 0 20px 0;
            font-size: 14px;
        `;

        // Input pour le nom
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.placeholder = 'Votre nom de joueur...';
        this.input.style.cssText = `
            width: 100%;
            padding: 12px;
            border: 2px solid #4a90e2;
            border-radius: 8px;
            font-size: 16px;
            margin-bottom: 20px;
            background: rgba(255, 255, 255, 0.9);
            color: #333;
            box-sizing: border-box;
        `;

        // Bouton de connexion
        this.button = document.createElement('button');
        this.button.textContent = '🚀 Rejoindre le jeu';
        this.button.style.cssText = `
            width: 100%;
            padding: 12px;
            background: linear-gradient(45deg, #ff6b6b, #ee5a24);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(238, 90, 36, 0.3);
        `;

        // Effet hover sur le bouton
        this.button.addEventListener('mouseenter', () => {
            this.button.style.transform = 'translateY(-2px)';
            this.button.style.boxShadow = '0 6px 20px rgba(238, 90, 36, 0.4)';
        });

        this.button.addEventListener('mouseleave', () => {
            this.button.style.transform = 'translateY(0)';
            this.button.style.boxShadow = '0 4px 15px rgba(238, 90, 36, 0.3)';
        });

        // Assembler les éléments
        loginBox.appendChild(title);
        loginBox.appendChild(subtitle);
        loginBox.appendChild(this.input);
        loginBox.appendChild(this.button);
        this.container.appendChild(loginBox);

        // Ajouter au DOM
        document.body.appendChild(this.container);

        // Charger le nom sauvegardé
        this.loadSavedName();

        // Gérer les événements
        this.setupEvents();
    }

    private loadSavedName() {
        const savedName = localStorage.getItem('gta-player-name');
        if (savedName) {
            this.input.value = savedName;
            this.input.style.borderColor = '#4CAF50';
            
            // Ajouter une indication visuelle
            const savedIndicator = document.createElement('div');
            savedIndicator.textContent = '✓ Nom sauvegardé trouvé';
            savedIndicator.style.cssText = `
                color: #4CAF50;
                font-size: 12px;
                margin-top: 5px;
                font-style: italic;
            `;
            this.input.parentNode?.insertBefore(savedIndicator, this.input.nextSibling);
            
            // Vérifier s'il y a une session valide
            const sessionData = localStorage.getItem('gta-session');
            if (sessionData) {
                try {
                    const session = JSON.parse(sessionData);
                    const maxAge = 24 * 60 * 60 * 1000; // 24 heures
                    const sessionAge = Date.now() - session.timestamp;
                    
                    if (sessionAge < maxAge) {
                        const sessionIndicator = document.createElement('div');
                        sessionIndicator.textContent = '🔄 Session active trouvée - Reconnexion automatique...';
                        sessionIndicator.style.cssText = `
                            color: #2196F3;
                            font-size: 12px;
                            margin-top: 5px;
                            font-weight: bold;
                        `;
                        this.input.parentNode?.insertBefore(sessionIndicator, this.input.nextSibling);
                        
                        // Auto-connexion après 2 secondes
                        setTimeout(() => {
                            this.handleLogin();
                        }, 2000);
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification de la session:', error);
                }
            }
        }
    }

    private setupEvents() {
        // Clic sur le bouton
        this.button.addEventListener('click', () => {
            this.handleLogin();
        });

        // Entrée dans l'input
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });

        // Focus sur l'input au chargement
        this.input.focus();
    }

    private handleLogin() {
        const name = this.input.value.trim();
        
        if (!name) {
            this.showError('Veuillez entrer un nom de joueur');
            return;
        }

        if (name.length < 2) {
            this.showError('Le nom doit contenir au moins 2 caractères');
            return;
        }

        if (name.length > 20) {
            this.showError('Le nom ne peut pas dépasser 20 caractères');
            return;
        }

        // Sauvegarder le nom
        localStorage.setItem('gta-player-name', name);
        
        // Masquer l'interface
        this.hide();
        
        // Appeler la fonction de callback
        this.onLogin(name);
    }

    private showError(message: string) {
        // Supprimer l'ancienne erreur si elle existe
        const existingError = this.container.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // Créer le message d'erreur
        const errorDiv = document.createElement('div');
        errorDiv.textContent = message;
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            color: #ff6b6b;
            font-size: 12px;
            margin-top: 5px;
            font-weight: bold;
        `;

        // Ajouter après l'input
        this.input.parentNode?.insertBefore(errorDiv, this.input.nextSibling);
        
        // Effet de shake sur l'input
        this.input.style.borderColor = '#ff6b6b';
        this.input.style.animation = 'shake 0.5s ease-in-out';
        
        setTimeout(() => {
            this.input.style.animation = '';
        }, 500);
    }

    private hide() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }

    public destroy() {
        this.hide();
    }
}
