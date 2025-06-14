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
# Production Images bauen und pushen (automatisch Multi-Platform!)
./scripts/build-smart.sh -e production -p

# ✅ Automatisch: AMD64 + ARM64 Support für maximum compatibility
# ✅ Automatisch: latest-production Tags
# ✅ Automatisch: Multi-Platform Manifest Verification 
# ✅ Automatisch: Manifest-Schutz (keine Überschreibung)
```
**Live-Test:** https://skillboxdocker2-u31060.vm.elestio.app ✅

## 🛠️ Build Scripts

### Smart Build System
- **Script:** `./scripts/build-smart.sh`
- **Unterstützte Environments:** development, production
- **Features:** 
  - Automatische Tagging
  - Multi-Stage Builds
  - **Multi-Platform Support (AMD64 + ARM64)**
  - **Manifest-Protection**
  - **Platform Verification**
  - Push zu Registry

### 🚨 **Platform-Kompatibilität (FIXED)**

**Das Script löst automatisch Platform-Probleme:**

✅ **Production**: Automatisch Multi-Platform (AMD64 + ARM64)  
✅ **Elestio**: Server kann die richtige Architektur auswählen  
✅ **Manifest-Schutz**: Multi-Platform Manifests werden nicht überschrieben  
✅ **Verification**: Script prüft Manifests nach dem Build  

**Verhindert diese Probleme:**
- ❌ "exec format error" auf AMD64 Servern
- ❌ Platform-Mismatch beim Docker Pull  
- ❌ Container starten aber funktionieren nicht
- ❌ 502 Bad Gateway durch nicht funktionsfähige Container

### Verwendung:
```bash
# Development Build (lokal testen)
./scripts/build-smart.sh -e development

# Production Build + Push (automatisch Multi-Platform!)
./scripts/build-smart.sh -e production -p

# Bei Platform-Problemen: Multi-Platform Manifest prüfen
docker buildx imagetools inspect ghcr.io/carstenrossi/skillbox-backend:latest-production
```

## 🔧 API Konfiguration

### Intelligente URL-Erkennung (Frontend)
Die Frontend-Konfiguration erkennt automatisch die Umgebung:

- **Port 3000** → API: `http://localhost:3001` (lokale Entwicklung)
- **Port 3003** → API: `http://localhost:3002` (Docker Dev - fest konfiguriert)
- **Production** → Relative URLs (Reverse Proxy)

### CORS-Konfiguration (Backend)
```env
CORS_ORIGIN=https://skillboxdocker2-u31060.vm.elestio.app,http://localhost:3000,http://localhost:3003
```

## 🎯 Best Practices

### ✅ DO's:
- Immer im **lokalen Source Code** entwickeln
- **Jeden Fix** durch alle 3 Environments testen
- **Smart Build Script** für konsistente Builds verwenden
- **API Response Format** standardisiert verwenden
- **Git Commits** vor Docker Builds machen
- **latest-production Tags** in docker-compose.prod.yml verwenden

### ❌ DON'Ts:
- Niemals direkt in Docker-Containern entwickeln
- Nicht Production pushen ohne Docker Dev Test
- Nicht während laufender Production-Tests deployen
- **Keine manuellen Docker Builds** (Smart Script verwenden)
- **Niemals Platform-spezifische Tags manuell erstellen**
- **Niemals Multi-Platform Manifests überschreiben**

## 📁 Wichtige Dateien

```
├── scripts/build-smart.sh          # Build Automation (FIXED)
├── docker-compose.dev.yml         # Development Container
├── docker-compose.prod.yml        # Production Container (FIXED)
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

### **Problem: "exec format error" (FIXED)**
- **Ursache:** Platform-Mismatch (ARM64 Image auf AMD64 Server)
- **Lösung:** ✅ Automatisch gelöst durch Multi-Platform Production Builds
- **Verifikation:** Script zeigt "Multi-Platform manifest verified"

### **Problem: 502 Bad Gateway (FIXED)**
- **Ursache:** Container starten nicht richtig wegen Platform-Problemen
- **Lösung:** ✅ Automatisch gelöst durch Multi-Platform Support
- **Check:** Container-Logs sollten keine "exec format error" zeigen

## 🔄 Synchronisation

**CRITICAL:** Alle 3 Environments müssen identischen Code verwenden!

1. **Source Code Fix** → Git Commit
2. **Docker Dev Build** → Test & Verify  
3. **Production Build** → **Multi-Platform Push** & Deploy

**Bei jeder Änderung diesen Workflow befolgen!**

## 🔒 **Platform-Problem Prevention**

### **Automatische Maßnahmen (implementiert):**
1. ✅ **Production Script** baut automatisch Multi-Platform
2. ✅ **Manifest-Schutz** verhindert Überschreibung  
3. ✅ **Verification** prüft Multi-Platform Support
4. ✅ **latest-production** Tags für konsistente Deployments

### **Manuelle Checks:**
```bash
# Bei Problemen: Multi-Platform Manifest prüfen
docker buildx imagetools inspect ghcr.io/carstenrossi/skillbox-backend:latest-production

# Sollte zeigen:
# Platform: linux/amd64 ✅
# Platform: linux/arm64 ✅

# Bei Deployment: Container-Logs prüfen
# ❌ BAD: "exec format error"
# ✅ GOOD: Normale Startup-Logs
```

## 🚨 **WICHTIG: Docker Build Cache Probleme**

### **Problem erkannt: 2025-06-04**
**Symptom:** `%22%22` in API URLs, 405 Fehler in Production
**Root Cause:** Docker Build Cache verwendete alte Frontend-Konfiguration trotz Code-Änderungen

### **✅ GELÖST: Smart Build Script mit automatischen Timestamp-Tags**
Das `build-smart.sh` Script verwendet jetzt **automatisch eindeutige Timestamp-Tags für Production**, um Docker Cache Probleme zu vermeiden:

- **Development:** `latest-development` (OK für lokale Tests)
- **Production:** `YYYYMMDD-HHMMSS` (eindeutige Tags, zwingt neue Image-Downloads)

### **Wann Build Cache Probleme auftreten:**
- 🔧 **Frontend-Konfiguration geändert** (`frontend/src/config/`)
- 🔧 **API-URLs oder Environment-Variablen angepasst**
- 🔧 **Backend-Konfiguration modifiziert** (`backend/src/config/`)
- 🔧 **Nach längerer Entwicklungspause**

### **Lösung: Smart Build Script verwenden**
```bash
# ✅ AUTOMATISCH: Unique Tags für Production
./scripts/build-smart.sh -e production -p
# → Generiert automatisch: 20250604-153045

# 🚫 Für kritische Cache-Probleme: --no-cache hinzufügen
./scripts/build-smart.sh -e production -p --no-cache
```

### **Manueller Fallback (nur bei Script-Problemen):**
```bash
# Nur verwenden wenn das Smart Script nicht funktioniert
docker buildx build --platform linux/amd64,linux/arm64 --no-cache --push \
  -t ghcr.io/carstenrossi/skillbox-frontend:$(date +%Y%m%d-%H%M%S) \
  -f docker/Dockerfile.frontend .
```

## 📞 Support

Bei Problemen mit dem Deployment-Workflow:
1. Diese Dokumentation konsultieren
2. Smart Build Script Logs prüfen  
3. Docker Logs analysieren
4. **Multi-Platform Manifests prüfen**
5. Environment-spezifische Configs prüfen

**Letzte Aktualisierung:** 2025-06-04  
**Version:** 3.2 (Smart Build Script mit automatischen Timestamp-Tags) 