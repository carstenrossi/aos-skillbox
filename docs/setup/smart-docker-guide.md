# Smart Docker Setup - ENV-basierte Konfiguration

## Übersicht

Dieses Setup implementiert eine smarte, ENV-basierte Konfiguration, die sowohl lokale Entwicklung als auch Production-Deployment unterstützt. Die Konfiguration passt sich automatisch an die Umgebung an.

## Architektur

### 1. Environment-spezifische Konfiguration

#### Frontend (`frontend/src/config/`)
```
frontend/src/config/
├── env.development.ts    # Development-Einstellungen
├── env.production.ts     # Production-Einstellungen
└── index.ts             # Zentrale Konfiguration mit Fallbacks
```

#### Backend (`backend/src/config/`)
```
backend/src/config/
├── env.development.ts    # Development-Einstellungen
├── env.production.ts     # Production-Einstellungen
└── index.ts             # Zentrale Konfiguration mit ENV-Overrides
```

### 2. Smarte Dockerfiles

#### Backend (`docker/Dockerfile.backend.smart`)
- Multi-stage Build
- Environment-aware Startup-Script
- Automatische Verzeichnis-Erstellung
- Health Checks
- Konfiguration wird zur Laufzeit geladen

#### Frontend (`docker/Dockerfile.frontend.smart`)
- Multi-stage Build mit React-Build
- Environment-spezifische nginx-Konfiguration
- Automatische nginx.conf-Auswahl basierend auf NODE_ENV
- Health Checks

### 3. Environment-spezifische nginx-Konfigurationen

#### Development (`docker/nginx.conf.dev`)
- Proxy zu `host.docker.internal:3001` (lokaler Backend)
- Debug-Logging aktiviert
- Cache deaktiviert für Development
- Relaxed Security Headers

#### Production (`docker/nginx.conf.prod`)
- Proxy zu `skillbox-backend:3001` (Container-Netzwerk)
- Optimierte Caching-Strategien
- Vollständige Security Headers
- Gzip-Kompression

## Verwendung

### Development

```bash
# Development-Container starten
docker-compose -f docker-compose.dev.yml up -d

# Logs anzeigen
docker-compose -f docker-compose.dev.yml logs -f

# Container stoppen
docker-compose -f docker-compose.dev.yml down
```

**Development-Konfiguration:**
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- API-Calls: Direkt an localhost:3001
- CORS: `http://localhost:3000`
- Database: `./data/skillbox.db` (lokales Volume)

### Production

```bash
# Production-Container bauen
docker-compose -f docker-compose.prod.smart.yml build

# Mit Environment-Variablen starten
JWT_SECRET=your-secret CORS_ORIGIN=https://your-domain.com docker-compose -f docker-compose.prod.smart.yml up -d
```

**Production-Konfiguration:**
- Frontend: Port 3000 (nginx)
- Backend: Interner Port 3001 (nur Container-Netzwerk)
- API-Calls: Relative URLs (nginx proxy)
- CORS: Konfigurierbar via ENV
- Tags: Timestamp-basierte Versionierung (z.B. 20250614-165511)
- Database: `/app/data/skillbox.db` (Docker Volume)

## Environment-Variablen

### Backend
```bash
NODE_ENV=production|development
PORT=3001
HOST=0.0.0.0
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=https://domain1.com,https://domain2.com
CORS_CREDENTIALS=true
DATABASE_PATH=/app/data/skillbox.db
LOG_LEVEL=info|debug
```

### Frontend
```bash
NODE_ENV=production|development
REACT_APP_API_URL=""  # Leer für relative URLs in Production
```

## Konfiguration-Hierarchie

### Backend
1. Environment-spezifische Config-Datei (`env.development.ts` / `env.production.ts`)
2. Environment-Variablen (überschreiben Config-Datei)
3. Fallback-Werte

### Frontend
1. Environment-spezifische Config-Datei
2. `process.env.REACT_APP_*` Variablen
3. Fallback-Werte

## Health Checks

### Backend Health Check
```bash
curl http://localhost:3001/health
```

Antwort:
```json
{
  "status": "healthy",
  "timestamp": "2025-06-04T06:57:56.244Z",
  "version": "1.0.0",
  "environment": "development",
  "database": "SQLite connected",
  "config": {
    "host": "0.0.0.0",
    "port": 3001,
    "cors_origin": "http://localhost:3000",
    "database_path": "./data/skillbox.db"
  }
}
```

### Frontend Health Check
```bash
curl http://localhost:3000
```

## Vorteile

1. **Einheitliche Dockerfiles**: Ein Dockerfile für alle Umgebungen
2. **Automatische Konfiguration**: Keine manuellen Änderungen zwischen Umgebungen
3. **Entwicklerfreundlich**: Lokale Entwicklung funktioniert out-of-the-box
4. **Production-ready**: Optimiert für Production-Deployment
5. **Debugging**: Umfangreiche Logs und Health Checks
6. **Sicherheit**: Environment-spezifische Security-Einstellungen

## Migration von alten Images

Die neuen smarten Images sind vollständig kompatibel mit den bestehenden Production-Images. Sie bieten zusätzlich:

- Bessere Debugging-Möglichkeiten
- Flexible Konfiguration
- Automatische Environment-Erkennung
- Verbesserte Health Checks

## Troubleshooting

### Container-Logs anzeigen
```bash
# Development
docker-compose -f docker-compose.dev.yml logs skillbox-backend
docker-compose -f docker-compose.dev.yml logs skillbox-frontend

# Production
docker-compose -f docker-compose.prod.smart.yml logs skillbox-backend
docker-compose -f docker-compose.prod.smart.yml logs skillbox-frontend
```

### Konfiguration überprüfen
```bash
# Backend-Konfiguration
curl http://localhost:3001/health | jq .config

# Container-Environment
docker exec skillbox-skillbox-backend-1 env | grep -E "(NODE_ENV|CORS|PORT)"
```

### Nginx-Konfiguration überprüfen
```bash
# Aktuelle nginx.conf anzeigen
docker exec skillbox-skillbox-frontend-1 cat /etc/nginx/nginx.conf
``` 