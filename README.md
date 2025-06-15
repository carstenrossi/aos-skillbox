# 🚀 Skillbox - AI Assistant Platform

Ein modernes Web-Interface für AI-Assistenten mit React Frontend und Node.js Backend.

## 🎯 **Deployment Workflow**

**⚠️ WICHTIG:** Dieses Projekt folgt einem **3-stufigen Deployment-Workflow**:

```
💻 Local Source Code  →  🐳 Docker Dev Testing  →  🚀 Production Deployment
```

### 📖 **Dokumentation**

- **🚀 [WORKFLOW_REFERENCE.md](WORKFLOW_REFERENCE.md)** - Quick Reference für Entwicklung
- **📋 [DEPLOYMENT.md](DEPLOYMENT.md)** - Vollständige Workflow-Dokumentation
- **🛠️ [scripts/build-smart.sh](scripts/build-smart.sh)** - Automatisierte Build-Pipeline

### ⚡ **Quick Start**

### Development (Phase 1)
```bash
# Start backend
cd backend && npm run dev

# Start frontend (new terminal)
cd frontend && npm start
```

### Docker Testing (Phase 2)
```bash
# Build development images
./scripts/build-smart.sh

# Test with Docker
docker-compose -f docker-compose.dev.yml up -d
```

### Production Deployment (Phase 3)
```bash
# Build and push production images
./scripts/build-smart.sh -e production -p
```

## 🚨 **Quick Fixes für häufige Probleme**

### **Problem: %22%22 in URLs oder 405 Fehler**
**Symptom:** Login schlägt fehl, URLs enthalten `%22%22`
**Ursache:** Docker Build Cache Problem
**Lösung:**
```bash
# Cache-freier Build für Production
./scripts/build-smart.sh -e production -p --no-cache
```

### **Problem: Frontend zeigt alte Version**
**Browser Hard-Refresh:** `Cmd/Ctrl + Shift + R`

### **Problem: Images sind nicht Multi-Platform**
**Überprüfung:**
```bash
docker buildx imagetools inspect ghcr.io/carstenrossi/skillbox-frontend:latest-production
```

## 🏗️ **Architektur**

### Frontend (React + TypeScript)
- **Port 3000** (lokal) / **Port 3003** (Docker Dev)
- Moderne React-App mit TypeScript
- Intelligente API URL-Erkennung für Multi-Environment
- Vite Build System für optimale Performance

### Backend (Node.js + Express + TypeScript)
- **Port 3001** (lokal) / **Port 3002** (Docker Dev)
- RESTful API mit standardisiertem Response Format
- SQLite-Datenbank mit automatischen Migrations
- JWT-basierte Authentifizierung
- CORS-Konfiguration für Cross-Origin Support

### Datenbank (SQLite)
- Automatische Schema-Migrations
- Backup-System (täglich, 7 Tage Retention)
- Persistent Volumes für Docker-Deployments

## 🌐 **Environments & Ports**

| Environment | Frontend | Backend | Purpose |
|-------------|----------|---------|---------|
| **Local Source** | localhost:3000 | localhost:3001 | Development & Debugging |
| **Docker Dev** | localhost:3003 | localhost:3002 | Container Testing (fest konfiguriert) |
| **Production** | Elestio Cloud | Elestio Cloud | Live System |

> **💡 Vorteil:** Die Docker Dev Umgebung verwendet feste Ports (3002/3003), damit sie parallel zur lokalen Entwicklung (3000/3001) laufen kann ohne Konflikte.

## 🔧 **Features**

### ✅ **Funktionell**
- 🤖 **Assistants Management** - Erstellen, Bearbeiten, Löschen
- 🛠️ **Tools Management** - API-Tools für Assistants
- 🔌 **Plugin System** - Erweiterbare Function Calling (NEU!)
- 👥 **User Management** - Rollen-basierte Zugriffskonrolle
- 💬 **Chat Interface** - Echtzeit-Kommunikation mit AI
- 🔐 **Authentication** - JWT-basierte Sicherheit
- 📊 **Admin Panel** - Vollständige Systemverwaltung

### 🔒 **Sicherheit**
- JWT-Token Authentifizierung
- Rollen-basierte Berechtigung (Admin, Manager, User)
- CORS-Schutz
- Input-Validierung
- Audit-Logging für Admin-Aktionen

### 🐳 **DevOps**
- Multi-Stage Docker Builds
- Automatisierte Build-Pipeline
- Environment-spezifische Konfiguration
- Health Checks & Monitoring
- Backup & Recovery

### 🔌 **Plugin System (NEU!)**
- **Function Calling** - Erweiterte AI-Funktionen
- **Bildgenerierung** - Flux, DALL-E, Midjourney Integration
- **Audio/Video** - ElevenLabs, RunwayML Support
- **Automatisierung** - n8n, Zapier Workflows
- **Sichere Architektur** - Isolierte Plugin-Ausführung
- **Plugin Store** - Marketplace für Erweiterungen (geplant)

## 🛠️ **Installation & Setup**

### Voraussetzungen
- Node.js 18+
- Docker & Docker Compose
- Git

### Lokale Entwicklung
```bash
# Repository clonen
git clone https://github.com/carstenrossi/skillbox.git
cd skillbox

# Backend Setup
cd backend
npm install
npm run dev

# Frontend Setup (neues Terminal)
cd frontend
npm install
npm start
```

### Docker Development
```bash
# Smart Build verwenden
./scripts/build-smart.sh -e development

# Container starten
docker-compose -f docker-compose.dev.yml up -d

# Testen: http://localhost:3003
```

## 🚀 **Deployment**

**Vollständige Anweisungen:** Siehe [DEPLOYMENT.md](DEPLOYMENT.md)

### Production Build
```bash
# Production Images bauen und pushen
./scripts/build-smart.sh -e production -p --multi-platform

# docker-compose.prod.yml aktualisieren
# Deploy to Elestio mit docker-compose.prod.elestio.yml
```

### ⚠️ Wichtige Deployment-Hinweise
- **AWS S3 Integration**: File Upload System benötigt AWS Credentials
- **Zwei Docker Compose Dateien**: 
  - `docker-compose.prod.yml` - Für GitHub (sichere Platzhalter)
  - `docker-compose.prod.elestio.yml` - Für Elestio (eingebettete Credentials)
- **Sicherheit**: Elestio-Datei ist in `.gitignore` geschützt

## 📁 **Projektstruktur**

```
skillbox/
├── 📋 DEPLOYMENT.md              # Vollständige Workflow-Docs
├── 🚀 WORKFLOW_REFERENCE.md      # Quick Reference
├── 🔌 PLUGIN_SYSTEM.md           # Plugin-System Dokumentation (NEU!)
├── 🛠️ scripts/build-smart.sh     # Build Automation
├── 🐳 docker-compose.*.yml       # Docker Configurations
├── 🔧 backend/                   # Node.js Backend
│   ├── src/routes/              # API Routes
│   ├── src/middleware/          # Authentication & Validation
│   ├── src/models/              # Plugin Models (NEU!)
│   ├── src/services/            # Business Logic
│   └── examples/                # Plugin-Beispiele (NEU!)
├── 🎨 frontend/                  # React Frontend
│   ├── src/components/          # UI Components
│   ├── src/services/            # API Communication
│   └── src/config/              # Environment Configuration
└── 🐳 docker/                    # Docker Build Files
```

## 🔍 **API Documentation**

### Standard Response Format
Alle APIs verwenden einheitliches Response Format:

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-06-04T07:53:11.522Z"
}
```

### Hauptendpunkte
- `GET /api/assistants` - Liste aller Assistants
- `POST /api/assistants` - Neuen Assistant erstellen
- `GET /api/tools` - Liste aller Tools
- `GET /api/plugins` - Liste aller Plugins (NEU!)
- `POST /api/plugins` - Plugin erstellen (NEU!)
- `POST /api/conversations/:id/messages` - Chat Message senden
- `POST /api/admin/users` - User erstellen (Admin)

## 🚨 **Troubleshooting**

### Häufige Probleme
- **CORS Errors:** Prüfe `frontend/src/config/index.ts`
- **API Format Errors:** Stelle sicher, dass `{ success: true, data: {...} }` verwendet wird
- **Auth Errors:** Überprüfe JWT Token in localStorage

### Support
1. 📖 Konsultiere [DEPLOYMENT.md](DEPLOYMENT.md) 
2. 🔍 Überprüfe Build Script Logs
3. 📊 Analysiere Docker Container Logs

## 👥 **Standard-Benutzer**

Nach dem Deployment sind folgende Test-Benutzer verfügbar:

```
admin / admin123      (Admin-Rechte)
manager / manager123  (Manager-Rechte)  
user / user123       (Standard-Rechte)
```

## 📄 **Lizenz**

MIT License

---

**🔄 Entwicklungsworkflow:** Source Code → Docker Dev → Docker Production  
**📖 Vollständige Dokumentation:** [DEPLOYMENT.md](DEPLOYMENT.md)  
**⚡ Quick Reference:** [WORKFLOW_REFERENCE.md](WORKFLOW_REFERENCE.md) 