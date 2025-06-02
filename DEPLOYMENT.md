# Skillbox Deployment Guide

## Übersicht
Skillbox ist eine React/Node.js-Anwendung für AI-Assistenten mit SQLite-Datenbank, die via Docker auf Elestio deployed wird.

## Aktuelle Production Images
- **Backend**: `ghcr.io/carstenrossi/skillbox-backend:20250602-134035`
- **Frontend**: `ghcr.io/carstenrossi/skillbox-frontend:20250602-134457`

## Erforderliche Umgebungsvariablen

### Backend (KRITISCH)
```bash
JWT_SECRET=nUZhjARF7Cy8TdQ8lHzQjXnAK5SibDEjXOYjyXxVrT8=
```
**⚠️ WICHTIG**: Ohne JWT_SECRET funktioniert die Authentifizierung nicht!

### Optional
```bash
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://ihre-domain.com,http://localhost:3000
CORS_CREDENTIALS=true
```

## Docker Deployment (Elestio)

### 1. Images für Production builden
```bash
# Backend für linux/amd64 (Elestio-kompatibel)
docker build --platform linux/amd64 -f docker/Dockerfile.backend -t ghcr.io/carstenrossi/skillbox-backend:YYYYMMDD-HHMMSS .
docker push ghcr.io/carstenrossi/skillbox-backend:YYYYMMDD-HHMMSS

# Frontend für linux/amd64
docker build --platform linux/amd64 -f docker/Dockerfile.frontend -t ghcr.io/carstenrossi/skillbox-frontend:YYYYMMDD-HHMMSS .
docker push ghcr.io/carstenrossi/skillbox-frontend:YYYYMMDD-HHMMSS
```

### 2. docker-compose.prod.yml verwenden
Die aktuelle `docker-compose.prod.yml` ist deployment-ready.

## Standard-Benutzer nach Deployment
```
admin / admin123      (Admin-Rechte)
manager / manager123  (Manager-Rechte)  
user / user123       (Standard-Rechte)
```

## Wichtige Architektur-Details

### Frontend (React + nginx)
- Port: 3000 (extern)
- Nginx reverse proxy für API-Calls zum Backend
- Environment Variable `REACT_APP_API_URL=""` für relative API-Pfade

### Backend (Node.js + Express)
- Port: 3001 (intern)
- SQLite-Datenbank mit automatischen Migrations
- JWT-basierte Authentifizierung
- CORS-Konfiguration für Cross-Origin-Requests

### Datenbank (SQLite)
- Automatische Migrations beim Start
- Persistent volumes: `backend_data` und `backend_logs`
- Standard-Benutzer werden automatisch erstellt

## Gelöste Deployment-Probleme

### 1. CORS-Fehler
**Problem**: Frontend machte Requests an `localhost:3001` statt relative URLs
**Lösung**: `REACT_APP_API_URL=""` im Frontend-Build setzen

### 2. Plattform-Kompatibilität 
**Problem**: `no matching manifest for linux/amd64`
**Lösung**: Images mit `--platform linux/amd64` builden

### 3. SQLite-Permissions
**Problem**: Backend konnte nicht auf SQLite-Datei zugreifen
**Lösung**: Container als root laufen lassen, automatische Ordner-Erstellung

### 4. Fehlende Tools-Migration
**Problem**: Tools konnten nicht erstellt werden
**Lösung**: Migration 8 (create_tools_table) zu migrations.ts Array hinzugefügt

### 5. Fehlende Authorization Headers
**Problem**: Admin konnte keine User erstellen
**Lösung**: `Authorization: Bearer ${token}` Header in AdminPanel hinzugefügt

## Funktionen-Status ✅

- ✅ Assistants erstellen/bearbeiten/löschen
- ✅ Tools erstellen/bearbeiten/löschen  
- ✅ User erstellen/bearbeiten/löschen (Admin Panel)
- ✅ Normale Registrierung (`/api/auth/register`)
- ✅ JWT-Authentifizierung
- ✅ Rollen-basierte Zugriffskonrolle
- ✅ CORS korrekt konfiguriert

## Debugging-Befehle

### Container-Logs anzeigen
```bash
docker logs skillbox-backend-1
docker logs skillbox-frontend-1
```

### In Container einsteigen
```bash
docker exec -it skillbox-backend-1 sh
docker exec -it skillbox-frontend-1 sh
```

### Local Testing
```bash
# Frontend lokal testen
docker run --rm -p 8080:80 ghcr.io/carstenrossi/skillbox-frontend:20250602-134457

# Backend lokal testen  
docker run --rm -p 3001:3001 -e JWT_SECRET=nUZhjARF7Cy8TdQ8lHzQjXnAK5SibDEjXOYjyXxVrT8= ghcr.io/carstenrossi/skillbox-backend:20250602-134035
```

## Nächste Updates

### Images aktualisieren:
1. Neue Images mit `--platform linux/amd64` builden
2. In `docker-compose.prod.yml` Image-Tags aktualisieren
3. Auf Elestio re-deployen
4. Dieses Dokument mit neuen Image-Tags aktualisieren

### Backup der SQLite-Datenbank:
```bash
docker exec skillbox-backend-1 sqlite3 /app/data/database.sqlite ".backup /app/data/backup-$(date +%Y%m%d).sqlite"
```

## Support-Kontakte
- GitHub Repository: [Repository-URL]
- Docker Images: `ghcr.io/carstenrossi/skillbox-*`
- Deployment Platform: Elestio

---
**Erstellt**: 2025-06-02  
**Letzte Aktualisierung**: 2025-06-02  
**Status**: ✅ Production Ready 