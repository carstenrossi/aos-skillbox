#!/bin/bash

# Skillbox Docker Setup Script
# Für korrektes lokales Development Setup

set -e

echo "🚀 Skillbox Docker Setup"
echo "========================"

# Prüfe ob Docker läuft
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker ist nicht gestartet. Bitte Docker Desktop starten."
    exit 1
fi

# Environment vorbereiten
if [ ! -f .env ]; then
    echo "📝 Erstelle .env Datei..."
    cp docker/env.template .env
    echo "⚠️  Bitte bearbeite .env und setze JWT_SECRET"
fi

# Stoppe existierende Container
echo "🛑 Stoppe existierende Container..."
docker-compose down 2>/dev/null || true

# Lösche alte Images für Fresh Build
echo "🗑️  Lösche alte Images..."
docker-compose build --no-cache

# Stelle sicher dass data/logs Verzeichnisse existieren
echo "📁 Erstelle Verzeichnisse..."
mkdir -p backend/data backend/logs

# Setze lokale Permissions (für Mac/Linux)
if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🔧 Setze Permissions..."
    # UID 1001 entspricht dem skillbox User im Container
    if [ -f backend/data/skillbox.db ]; then
        echo "📊 Existierende Datenbank gefunden - setze Permissions..."
        chmod 644 backend/data/skillbox.db
        chmod 644 backend/data/*.json 2>/dev/null || true
    fi
fi

# Starte Container
echo "🐳 Starte Docker Container..."
docker-compose up -d

# Warte auf Backend
echo "⏳ Warte auf Backend startup..."
sleep 5

# Prüfe ob alles läuft
if curl -f http://localhost:3001/api/assistants > /dev/null 2>&1; then
    echo "✅ Backend läuft!"
else
    echo "⚠️  Backend noch nicht bereit, das ist normal beim ersten Start"
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend läuft!"
else
    echo "⚠️  Frontend noch nicht bereit, das ist normal beim ersten Start"
fi

echo ""
echo "🎉 Setup abgeschlossen!"
echo ""
echo "📱 Öffne: http://localhost:3000"
echo "🔑 Login: admin / admin123"
echo ""
echo "📊 Logs anzeigen: docker-compose logs -f"
echo "🛑 Stoppen: docker-compose down" 