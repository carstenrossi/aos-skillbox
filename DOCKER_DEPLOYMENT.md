# Skillbox Docker Deployment Anleitung

## 🎯 Ziel
Skillbox-Anwendung über Docker auf Elestio bereitstellen, ohne den bestehenden Code zu ändern.

## 📋 Voraussetzungen

### 1. GitHub Personal Access Token erstellen
1. Gehe zu: https://github.com/settings/tokens
2. Klicke "Generate new token (classic)"
3. Scope auswählen: `write:packages`
4. Token kopieren und sicher speichern

### 2. Docker Desktop installiert
- Download: https://www.docker.com/products/docker-desktop/

## 🚀 Lokales Testing (Development)

### Einfache Methode (empfohlen):
```bash
# One-Click Setup (löst automatisch Permission-Probleme)
./scripts/docker-setup.sh
```

### Manuelle Methode:
```bash
# Environment-Variablen setzen
export JWT_SECRET=super-sicherer-jwt-secret-für-backend-auth

# Docker starten
docker-compose up --build
```

**Vorteile der neuen Konfiguration:**
- ✅ **Lokale Daten** werden direkt gemountet (keine Kopie nötig)
- ✅ **Permissions** werden automatisch korrekt gesetzt
- ✅ **Existierende Assistants** sind sofort verfügbar
- ✅ **Änderungen** werden persistent gespeichert

## 🌐 Production Deployment (Elestio)

### Schritt 1: Environment-Variablen setzen

```bash
# Terminal öffnen und ins Skillbox-Verzeichnis wechseln
cd /Users/carstenrossi/coding/Skillbox

# Environment-Variablen setzen (ersetze mit deinen Werten)
export GITHUB_USERNAME=carsten
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
export JWT_SECRET=super-sicherer-jwt-secret-für-backend-auth
```

**Wichtiger Hinweis:** 
- `JWT_SECRET` wird nur für Backend-Authentifizierung (User-Login) verwendet
- Assistant-spezifische JWT-Tokens werden über das Admin-Panel pro Assistant konfiguriert
- Es gibt **keine zentrale** `ASSISTANT_OS_API_KEY`

### Schritt 2: Docker Images bauen und pushen

```bash
# Script ausführen
./scripts/build-and-push.sh
```

Das Script wird:
- ✅ Bei GitHub Container Registry anmelden
- ✅ Docker Images für Backend und Frontend bauen  
- ✅ Images zu ghcr.io pushen
- ✅ Bestätigung ausgeben

### Schritt 3: Elestio Deployment

1. **Gehe zu https://elest.io**
2. **Account erstellen/anmelden**
3. **"New Service" klicken**
4. **"Custom Docker Compose" wählen**

#### 3.1 Docker Compose Konfiguration
- Lade `docker-compose.prod.yml` hoch
- Oder kopiere den Inhalt manuell:

```yaml
version: '3.8'

services:
  skillbox-backend:
    image: ghcr.io/carsten/skillbox-backend:latest
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - backend_data:/app/data
      - backend_logs:/app/logs
    restart: unless-stopped
    user: "1001:1001"

  skillbox-frontend:
    image: ghcr.io/carsten/skillbox-frontend:latest
    ports:
      - "3000:80"
    depends_on:
      - skillbox-backend
    restart: unless-stopped

volumes:
  backend_data:
    driver: local
  backend_logs:
    driver: local
```

#### 3.2 Environment-Variablen in Elestio setzen

In der Elestio-Konfiguration **nur**:
```
JWT_SECRET=super-sicherer-jwt-secret-für-backend-auth
```

#### 3.3 Registry-Credentials konfigurieren

Falls die Images private sind:
- Registry: `ghcr.io`
- Username: `carsten`
- Password: `dein-github-token`

### Schritt 4: Deployment starten

1. **"Deploy" klicken**
2. **Warte auf Deployment (2-5 Minuten)**
3. **URL notieren** (z.B. `https://skillbox-xxx.elestio.app`)

## 🔧 Assistant-Konfiguration

**Nach dem Deployment** müssen die Assistant JWT-Tokens über das Admin-Panel konfiguriert werden:

1. **Als Admin anmelden:** `admin / admin123`
2. **Assistant Management** öffnen
3. **Für jeden Assistant** den korrekten `jwt_token` eintragen:
   - Narrative Coach: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - CSRD Coach: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - etc.

**Die Default-Assistants werden automatisch erstellt**, aber Sie müssen die echten JWT-Tokens über die UI eintragen.

## 🌐 Für Tester

Nach erfolgreichem Deployment und Assistant-Konfiguration erhalten Tester:

```
🚀 Skillbox Test-Umgebung
URL: https://skillbox-xxx.elestio.app

Login-Daten:
👑 Admin:   admin / admin123
👤 Manager: manager / manager123  
👤 User:    user / user123
```

## 🔧 Updates deployen

Für neue Versionen:

```bash
# Neue Images bauen und pushen
./scripts/build-and-push.sh

# In Elestio: Service neu starten
# Die neuen Images werden automatisch gepullt
```

## 📁 Datei-Übersicht

Neue Dateien (ohne Code-Änderungen):
```
Skillbox/
├── docker-compose.dev.yml      # Für lokales Docker-Development (Port 3003)
├── docker-compose.prod.yml     # ✅ Für Elestio Deployment (Multi-Platform Images)
├── docker-compose.prod.smart.yml # Für lokale Builds ohne Images
├── docker/
│   ├── Dockerfile.backend.smart    # Backend Multi-Platform Docker-Konfiguration
│   ├── Dockerfile.frontend.smart   # Frontend Multi-Platform Docker-Konfiguration
│   ├── Dockerfile.backend         # Legacy Backend Dockerfile
│   ├── Dockerfile.frontend        # Legacy Frontend Dockerfile
│   └── env.template               # Environment-Template
├── scripts/
│   ├── docker-setup.sh            # Lokales Setup mit Permission-Fix
│   ├── build-and-push.sh          # Legacy Build/Push-Script
│   └── build-smart.sh             # ✅ Moderner Multi-Platform Build/Push
└── DOCKER_DEPLOYMENT.md           # Diese Anleitung
```

## ⚠️ Wichtige Verbesserungen

### **Permission-Probleme behoben:**
- ✅ **User/Group** korrekt konfiguriert (UID 1001)
- ✅ **Lokale Mounts** verwenden existierende Daten direkt
- ✅ **Setup-Script** korrigiert automatisch Permissions

### **Daten-Persistenz:**
- ✅ **Development**: Direkte Mounts (`./backend/data:/app/data`)
- ✅ **Production**: Docker Volumes mit korrekten User-IDs
- ✅ **Keine manuelle Kopie** mehr nötig

## 🆘 Troubleshooting

### Problem: "Permission denied"
```bash
chmod +x scripts/docker-setup.sh
./scripts/docker-setup.sh
```

### Problem: "SQLITE_READONLY"
```bash
# Setup-Script ausführen (behebt automatisch)
./scripts/docker-setup.sh
```

### Problem: "Docker login failed"
- GitHub Token nochmal überprüfen
- Scope `write:packages` muss gesetzt sein

### Problem: "Image not found" in Elestio
- Images müssen public sein oder Registry-Credentials setzen
- Correct image names: `ghcr.io/carsten/skillbox-backend:latest`

### Problem: "Assistants antworten nicht"
- Prüfe Assistant JWT-Tokens im Admin-Panel
- Jeder Assistant braucht seinen eigenen gültigen Token
- Teste Assistant-Konfiguration einzeln

## 🎉 Fertig!

Skillbox läuft jetzt professionell in der Cloud über Elestio, ohne Änderungen am bestehenden Code! 