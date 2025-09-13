export class ChatManager {
    private chatContainer: HTMLElement;
    private chatMessages: HTMLElement;
    private chatInput: HTMLInputElement;
    private chatIndicator: HTMLElement;
    private chatNotifications: HTMLElement;
    private isOpen = false;
    private onSendMessage?: (message: string) => void;
    private notificationQueue: Array<{element: HTMLElement, timeout: NodeJS.Timeout}> = [];

    constructor() {
        this.chatContainer = document.getElementById('chat-container')!;
        this.chatMessages = document.getElementById('chat-messages')!;
        this.chatInput = document.getElementById('chat-input') as HTMLInputElement;
        this.chatIndicator = document.getElementById('chat-indicator')!;
        this.chatNotifications = document.getElementById('chat-notifications')!;
        
        this.setupEventListeners();
        this.showIndicator();
    }

    private setupEventListeners() {
        // Ouvrir le chat avec Entrée
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !this.isOpen) {
                this.openChat();
                event.preventDefault();
            }
        });

        // Fermer le chat avec Échap
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isOpen) {
                this.closeChat();
                event.preventDefault();
            }
        });

        // Envoyer le message avec Entrée
        this.chatInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                const message = this.chatInput.value.trim();
                if (message) {
                    this.sendMessage(message);
                    this.chatInput.value = '';
                }
                event.preventDefault();
            }
        });

        // Fermer le chat en cliquant en dehors
        document.addEventListener('click', (event) => {
            if (this.isOpen && !this.chatContainer.contains(event.target as Node)) {
                this.closeChat();
            }
        });
    }

    public openChat() {
        this.isOpen = true;
        this.chatContainer.style.display = 'flex';
        this.chatIndicator.style.display = 'none';
        this.chatInput.focus();
        
        // Nettoyer les notifications quand le chat s'ouvre
        this.clearNotifications();
    }
    
    private clearNotifications() {
        this.notificationQueue.forEach(item => {
            clearTimeout(item.timeout);
            if (item.element.parentNode) {
                item.element.parentNode.removeChild(item.element);
            }
        });
        this.notificationQueue = [];
    }

    public closeChat() {
        this.isOpen = false;
        this.chatContainer.style.display = 'none';
        this.chatIndicator.style.display = 'block';
        this.chatInput.blur();
    }

    public sendMessage(message: string) {
        if (this.onSendMessage) {
            this.onSendMessage(message);
        }
    }

    public addMessage(sender: string, message: string, type: 'player' | 'system' | 'server' = 'player') {
        const messageDiv = document.createElement('div');
        messageDiv.style.marginBottom = '5px';
        messageDiv.style.wordWrap = 'break-word';

        const timestamp = new Date().toLocaleTimeString();
        
        switch (type) {
            case 'player':
                messageDiv.innerHTML = `<span style="color: #4CAF50;">[${timestamp}] ${sender}:</span> <span style="color: white;">${message}</span>`;
                break;
            case 'system':
                messageDiv.innerHTML = `<span style="color: #FF9800;">[${timestamp}] ${sender}:</span> <span style="color: #FFC107;">${message}</span>`;
                break;
            case 'server':
                messageDiv.innerHTML = `<span style="color: #2196F3;">[${timestamp}] Serveur:</span> <span style="color: #E3F2FD;">${message}</span>`;
                break;
        }

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Afficher aussi une notification visible si le chat n'est pas ouvert
        if (!this.isOpen) {
            this.showNotification(sender, message, type);
        }
    }
    
    private showNotification(sender: string, message: string, type: 'player' | 'system' | 'server' = 'player') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            margin-bottom: 5px;
            border-radius: 5px;
            border-left: 4px solid #666;
            font-size: 13px;
            word-wrap: break-word;
            opacity: 0;
            transform: translateX(-20px);
            transition: all 0.3s ease;
            max-width: 100%;
        `;
        
        // Couleur de la bordure selon le type
        switch (type) {
            case 'player':
                notification.style.borderLeftColor = '#4CAF50';
                notification.innerHTML = `<strong style="color: #4CAF50;">${sender}:</strong> ${message}`;
                break;
            case 'system':
                notification.style.borderLeftColor = '#FF9800';
                notification.innerHTML = `<strong style="color: #FF9800;">${sender}:</strong> <span style="color: #FFC107;">${message}</span>`;
                break;
            case 'server':
                notification.style.borderLeftColor = '#2196F3';
                notification.innerHTML = `<strong style="color: #2196F3;">Serveur:</strong> <span style="color: #E3F2FD;">${message}</span>`;
                break;
        }
        
        this.chatNotifications.appendChild(notification);
        
        // Animation d'entrée
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Supprimer après 4 secondes
        const timeout = setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                // Retirer de la queue
                this.notificationQueue = this.notificationQueue.filter(item => item.element !== notification);
            }, 300);
        }, 4000);
        
        // Ajouter à la queue pour pouvoir nettoyer si nécessaire
        this.notificationQueue.push({ element: notification, timeout });
        
        // Limiter à 5 notifications maximum
        if (this.notificationQueue.length > 5) {
            const oldest = this.notificationQueue.shift();
            if (oldest) {
                clearTimeout(oldest.timeout);
                if (oldest.element.parentNode) {
                    oldest.element.parentNode.removeChild(oldest.element);
                }
            }
        }
    }

    public addServerNotification(message: string) {
        this.addMessage('', message, 'server');
    }

    public setOnSendMessage(callback: (message: string) => void) {
        this.onSendMessage = callback;
    }

    private showIndicator() {
        this.chatIndicator.style.display = 'block';
    }

    private scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    public isChatOpen(): boolean {
        return this.isOpen;
    }
}
