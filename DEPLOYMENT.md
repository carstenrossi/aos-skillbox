# 🚀 Skillbox Deployment Workflow

## 📖 Übersicht

Dieses Dokument beschreibt den **3-stufigen Deployment-Workflow** für das Skillbox-Projekt:

```
Source Code → Docker Dev → Docker Production (Elestio)
```

## 🏗️ Development Environments

### 1. **Lokaler Source Code** (Primary Development)
- **Frontend:** http://localhost:3000 (React Dev Server)
- **Backend:** http://localhost:3001 (Node.js mit nodemon)
- **Verwendung:** Hauptentwicklung, schnelle Iteration, Debugging
- **Vorteile:** Hot Reload, Source Maps, schnelle Builds

### 2. **Docker Development** (Pre-Production Testing)
- **Frontend:** http://localhost:3003 (Port 3003 - fest konfiguriert)
- **Backend:** http://localhost:3002 (Port 3002 - fest konfiguriert)
- **Verwendung:** Test der Container-Images vor Production
- **Zweck:** Sicherstellen dass Docker-Builds funktionieren
- **Vorteil:** Keine Port-Konflikte mit lokaler Entwicklung

### 3. **Docker Production** (Elestio Cloud)
- **URL:** https://skillboxdocker-u31060.vm.elestio.app
- **Verwendung:** Finaler Produktionstest und Live-System
- **Registry:** GitHub Container Registry (ghcr.io)

## 🔄 Mandatory Workflow

### ⚠️ WICHTIGE REGEL:
**NIEMALS direkt in Docker-Images entwickeln!** 
Alle Änderungen MÜSSEN im **lokalen Source Code** gemacht und dann durch den kompletten Workflow getestet werden.

### Schritt-für-Schritt Prozess:

#### 1️⃣ **Lokale Entwicklung**
```bash
# Backend starten (Terminal 1)
cd backend && npm run dev

# Frontend starten (Terminal 2) 
cd frontend && npm start
```
**Testen:** http://localhost:3000 ✅

#### 2️⃣ **Docker Dev Build & Test**
```bash
# Smart Build für Development
./scripts/build-smart.sh -e development

# Test-Container starten 
docker-compose -f docker-compose.dev.yml up -d

# Testen auf festen Ports (keine Konflikte mit lokaler Entwicklung)
# Frontend: http://localhost:3003 (fest konfiguriert)
# Backend: http://localhost:3002 (fest konfiguriert)
```
**Vollständig testen:** Alle Features funktional ✅

#### 3️⃣ **Production Build & Push**
```bash
# Production Images bauen und pushen
./scripts/build-smart.sh -e production -p

# docker-compose.prod.yml mit neuen Tags aktualisieren
# Elestio Deployment triggern
```
**Live-Test:** https://skillboxdocker-u31060.vm.elestio.app ✅

## 🛠️ Build Scripts

### Smart Build System
- **Script:** `./scripts/build-smart.sh`
- **Unterstützte Environments:** development, production
- **Features:** Automatische Tagging, Multi-Stage Builds, Push zu Registry

### Verwendung:
```bash
# Development Build (lokal testen)
./scripts/build-smart.sh -e development

# Production Build + Push
./scripts/build-smart.sh -e production -p
```

## 🔧 API Konfiguration

### Intelligente URL-Erkennung (Frontend)
Die Frontend-Konfiguration erkennt automatisch die Umgebung:

- **Port 3000** → API: `http://localhost:3001` (lokale Entwicklung)
- **Port 3003** → API: `http://localhost:3002` (Docker Dev - fest konfiguriert)
- **Production** → Relative URLs (Reverse Proxy)

### CORS-Konfiguration (Backend)
```env
CORS_ORIGIN=https://skillboxdocker-u31060.vm.elestio.app,http://localhost:3000,http://localhost:3003
```

## 🎯 Best Practices

### ✅ DO's:
- Immer im **lokalen Source Code** entwickeln
- **Jeden Fix** durch alle 3 Environments testen
- **Smart Build Script** für konsistente Builds verwenden
- **API Response Format** standardisiert verwenden
- **Git Commits** vor Docker Builds machen

### ❌ DON'Ts:
- Niemals direkt in Docker-Containern entwickeln
- Nicht Production pushen ohne Docker Dev Test
- Nicht während laufender Production-Tests deployen
- Keine manuellen Docker Builds (Smart Script verwenden)

## 📁 Wichtige Dateien

```
├── scripts/build-smart.sh          # Build Automation
├── docker-compose.dev.yml         # Development Container
├── docker-compose.prod.yml        # Production Container  
├── docker/Dockerfile.*.smart      # Multi-Stage Dockerfiles
├── frontend/src/config/index.ts   # Environment Detection
└── DEPLOYMENT.md                  # Diese Dokumentation
```

## 🚨 Troubleshooting

### Problem: CORS Errors
- **Ursache:** Frontend ruft falsches Backend auf
- **Lösung:** Smart URL Detection in config/index.ts prüfen

### Problem: API Response Format Errors  
- **Ursache:** Inkonsistente Response Formats
- **Lösung:** Alle APIs müssen `{ success: true, data: {...} }` Format verwenden

### Problem: Docker Build Failures
- **Ursache:** Meist Dependency oder Context Issues
- **Lösung:** Smart Build Script verwenden, nicht manuelle Builds

## 🔄 Synchronisation

**CRITICAL:** Alle 3 Environments müssen identischen Code verwenden!

1. **Source Code Fix** → Git Commit
2. **Docker Dev Build** → Test & Verify  
3. **Production Build** → Push & Deploy

**Bei jeder Änderung diesen Workflow befolgen!**

---

## 📞 Support

Bei Problemen mit dem Deployment-Workflow:
1. Diese Dokumentation konsultieren
2. Smart Build Script Logs prüfen  
3. Docker Logs analysieren
4. Environment-spezifische Configs prüfen

**Letzte Aktualisierung:** 2025-06-04
**Version:** 2.0 (nach API Standardisierung) 