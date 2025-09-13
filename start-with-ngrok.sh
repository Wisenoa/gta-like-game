#!/bin/bash

# Script pour démarrer le jeu avec ngrok
echo "🎮 Démarrage du jeu GTA-like avec ngrok..."

# Vérifier si ngrok est installé
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok n'est pas installé. Installez-le d'abord."
    exit 1
fi

# Démarrer le backend en arrière-plan
echo "🚀 Démarrage du serveur backend..."
cd backend
yarn start:dev &
BACKEND_PID=$!

# Attendre que le backend démarre
sleep 5

# Démarrer le frontend en arrière-plan
echo "🌐 Démarrage du serveur frontend..."
cd ../frontend
yarn dev &
FRONTEND_PID=$!

# Attendre que le frontend démarre
sleep 5

# Démarrer ngrok pour le frontend
echo "🌍 Création du tunnel ngrok..."
ngrok http 3000 --log=stdout &
NGROK_PID=$!

echo ""
echo "✅ Serveurs démarrés !"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:3001"
echo "🌍 Tunnel ngrok: Vérifiez la console ngrok pour l'URL publique"
echo ""
echo "Pour arrêter tous les services, appuyez sur Ctrl+C"

# Fonction pour nettoyer les processus
cleanup() {
    echo ""
    echo "🛑 Arrêt des services..."
    kill $BACKEND_PID $FRONTEND_PID $NGROK_PID 2>/dev/null
    exit 0
}

# Capturer Ctrl+C
trap cleanup SIGINT

# Attendre indéfiniment
wait
