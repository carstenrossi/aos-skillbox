# 🚀 Skillbox Deployment Guide

## 📋 Übersicht

Dieses Dokument beschreibt den vollständigen 3-stufigen Deployment-Workflow für das Skillbox File Upload System:

1. **Local Development** - Entwicklung und Testing
2. **Docker Development** - Container-Testing vor Production
3. **Production Deployment** - Live-System auf Elestio

## 🔧 File Upload System - AWS S3 Integration

### AWS Credentials Konfiguration

Das File Upload System benötigt AWS S3 Credentials für die Speicherung von hochgeladenen Dateien.

#### 🔑 Produktive AWS Credentials
```
AWS_ACCESS_KEY_ID=AKIA***************
AWS_SECRET_ACCESS_KEY=********************************
AWS_REGION=eu-north-1
AWS_S3_BUCKET=skillbox-master
```

> **🔐 Hinweis**: Die vollständigen Credentials sind in `docker-compose.prod.elestio.yml` hinterlegt

#### 📁 Docker Compose Dateien

**Zwei verschiedene Production-Dateien:**

1. **`docker-compose.prod.yml`** - Für GitHub Repository
   - Verwendet Environment Variables Platzhalter
   - Sicher für öffentliche Repositories
   - Beispiel:
   ```yaml
   environment:
     - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
     - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
   ```

2. **`docker-compose.prod.elestio.yml`** - Für Elestio Deployment
   - Enthält eingebettete AWS Credentials
   - **NICHT in Git committed** (in `.gitignore`)
   - Direkt für Elestio Deployment verwendbar
   - Beispiel:
   ```yaml
   environment:
     - AWS_ACCESS_KEY_ID=AKIA***************
     - AWS_SECRET_ACCESS_KEY=********************************
   ```

#### 🔒 Sicherheitsmaßnahmen

- **GitHub Protection**: `docker-compose.prod.elestio.yml` ist in `.gitignore` eingetragen
- **Credential Separation**: Produktive Credentials nur in Elestio-spezifischer Datei
- **Environment Variables**: GitHub-Version verwendet sichere Platzhalter

## 🏗️ Build & Deployment Workflow

### Phase 1: Local Development

```bash
# Backend lokal starten
cd backend
npm install
npm run dev  # Port 3001

# Frontend lokal starten
cd frontend
npm install
npm start    # Port 3000
```

### Phase 2: Docker Development Testing

```bash
# Development Images bauen
./scripts/build-smart.sh -e development

# Container starten
docker-compose -f docker-compose.dev.yml up -d

# Testen
curl http://localhost:3002/health  # Backend
curl http://localhost:3003         # Frontend
```

### Phase 3: Production Deployment

#### 3.1 Production Images bauen

```bash
# Multi-Platform Production Images bauen und pushen
./scripts/build-smart.sh -e production -p --multi-platform
```

**Beispiel Output:**
```
🚀 Building for multiple platforms: linux/amd64,linux/arm64
🏷️ Using unique production tag: 20250615-214126
✅ Multi-Platform images pushed successfully!
📦 Images available:
   - ghcr.io/carstenrossi/skillbox-backend:20250615-214126
   - ghcr.io/carstenrossi/skillbox-frontend:20250615-214126
```

#### 3.2 Docker Compose Dateien aktualisieren

```bash
# Automatische Tag-Updates in beiden Dateien
git add docker-compose.prod.yml
git commit -m "deploy: Update production images to 20250615-214126"
git push origin main
```

#### 3.3 Elestio Deployment

**Auf Elestio Dashboard:**
1. Service auswählen: `skillboxdocker2`
2. **Wichtig**: `docker-compose.prod.elestio.yml` verwenden (nicht die GitHub-Version!)
3. Service neu deployen
4. Logs überwachen

**Erwartete Startup-Logs:**
```
🔧 Setting up File Upload System...
📁 Initializing File Service...
✅ File Service initialized
☁️ Initializing S3 Service...
✅ S3 Service: Configuration loaded from database successfully
🔍 Initializing Text Extraction Processor...
✅ Text Extraction Processor initialized
✅ File Upload System ready!
```

## 📊 File Upload System Features

### Unterstützte Dateiformate
- **Dokumente**: PDF, DOC, DOCX, TXT, RTF
- **Bilder**: JPG, JPEG, PNG, GIF, WEBP, SVG
- **Audio**: MP3, WAV, M4A, OGG
- **Video**: MP4, AVI, MOV, WEBM
- **Archive**: ZIP, RAR, 7Z
- **Daten**: CSV, JSON, XML

### Automatische Features
- **S3 Upload**: Sichere Speicherung in AWS S3
- **Text Extraction**: Automatische Textextraktion aus PDFs und Dokumenten
- **AI Chat Integration**: Hochgeladene Dateien werden automatisch in Chat-Kontext eingebunden
- **Clickable Links**: Direkte Download-Links in Chat-Nachrichten

### Technische Details
- **Max. Dateigröße**: 10MB
- **S3 Bucket**: `skillbox-master` (EU North 1)
- **Background Processing**: Asynchrone Textextraktion
- **Database Integration**: File-Metadaten in SQLite gespeichert

## 🔍 Monitoring & Debugging

### Health Checks
```bash
# Backend Health Check
curl https://skillboxdocker2-u31060.vm.elestio.app/api/health

# S3 Configuration Check
curl https://skillboxdocker2-u31060.vm.elestio.app/api/admin/s3-config
```

### Log-Monitoring
```bash
# Container Logs anzeigen
docker-compose -f docker-compose.prod.elestio.yml logs -f skillbox-backend

# Spezifische Service-Logs
docker logs skillboxdocker2-skillbox-backend-1 -f
```

### File Upload Testing
```bash
# Test File Upload
curl -X POST \
  https://skillboxdocker2-u31060.vm.elestio.app/api/files/upload \
  -F "file=@test.pdf" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🚨 Troubleshooting

### Problem: File Upload 503 Error
**Ursache**: S3 Service nicht initialisiert
**Lösung**: 
1. AWS Credentials in `docker-compose.prod.elestio.yml` prüfen
2. Container neu starten
3. Logs auf S3 Service Initialisierung prüfen

### Problem: Fehlende File Upload Logs
**Ursache**: Altes Docker Image wird verwendet
**Lösung**:
1. Neuestes Image Tag in `docker-compose.prod.elestio.yml` prüfen
2. `docker-compose pull` ausführen
3. Service neu deployen

### Problem: AWS Credentials nicht geladen
**Ursache**: Environment Variables nicht korrekt gesetzt
**Lösung**:
1. `docker-compose.prod.elestio.yml` verwenden (nicht GitHub-Version!)
2. Credentials direkt in YAML eingebettet prüfen
3. Container-Environment mit `docker exec` prüfen

## 📁 Wichtige Dateien

```
skillbox/
├── docker-compose.prod.yml           # GitHub-Version (sichere Platzhalter)
├── docker-compose.prod.elestio.yml   # Elestio-Version (eingebettete Credentials)
├── .gitignore                        # Schützt Elestio-Datei vor Git
├── scripts/build-smart.sh            # Automatisierter Build-Prozess
└── backend/src/
    ├── services/fileService.ts       # File Upload Logic
    ├── services/s3Service.ts         # AWS S3 Integration
    └── services/textExtractionProcessor.ts  # Background Text Processing
```

## 🎯 Production URLs

- **Frontend**: https://skillboxdocker2-u31060.vm.elestio.app
- **Backend API**: https://skillboxdocker2-u31060.vm.elestio.app/api
- **Health Check**: https://skillboxdocker2-u31060.vm.elestio.app/api/health
- **S3 Config**: https://skillboxdocker2-u31060.vm.elestio.app/api/admin/s3-config

## 🔄 Deployment Checklist

### Vor dem Deployment
- [ ] Lokale Tests erfolgreich
- [ ] Docker Development Tests erfolgreich
- [ ] Production Images gebaut und gepusht
- [ ] `docker-compose.prod.elestio.yml` mit korrekten Image Tags aktualisiert
- [ ] AWS Credentials in Elestio-Datei eingebettet

### Nach dem Deployment
- [ ] Health Check erfolgreich
- [ ] File Upload System Logs sichtbar
- [ ] S3 Service initialisiert
- [ ] Test File Upload erfolgreich
- [ ] Text Extraction funktional

---

**🔐 Sicherheitshinweis**: Verwende immer `docker-compose.prod.elestio.yml` für Elestio Deployments, niemals die GitHub-Version mit Platzhaltern! 