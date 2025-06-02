# Skillbox - AI Assistant Management Platform

Eine moderne Web-Anwendung zur Verwaltung von AI-Assistenten, Tools und Benutzern.

## 🚀 Features

- **Assistant Management**: Erstellen, bearbeiten und verwalten Sie AI-Assistenten
- **Tool Integration**: Externe Tools in die Plattform einbinden
- **User Management**: Vollständige Benutzerverwaltung mit Rollen (Admin/Manager/User)
- **Authentication**: Sichere JWT-basierte Authentifizierung
- **Responsive Design**: Moderne React-Oberfläche mit Tailwind CSS

## 🏗️ Technologie-Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, SQLite
- **Authentication**: JWT (JSON Web Tokens)
- **Deployment**: Docker, nginx

## 📦 Quick Start

### Produktions-Deployment (Elestio)

Verwenden Sie die bereitgestellte `docker-compose.prod.yml`:

```bash
# Wichtige Umgebungsvariable setzen
export JWT_SECRET="nUZhjARF7Cy8TdQ8lHzQjXnAK5SibDEjXOYjyXxVrT8="

# Deployment starten
docker-compose -f docker-compose.prod.yml up -d
```

**📋 Detaillierte Deployment-Anleitung: [DEPLOYMENT.md](./DEPLOYMENT.md)**

### Lokale Entwicklung

```bash
# Repository klonen
git clone [repository-url]
cd Skillbox

# Backend starten
cd backend
npm install
npm run dev

# Frontend starten (neues Terminal)
cd frontend
npm install
npm run dev
```

## 👥 Standard-Benutzer

Nach dem ersten Start sind folgende Benutzer verfügbar:

| Benutzername | Passwort | Rolle |
|--------------|----------|-------|
| admin | admin123 | Admin |
| manager | manager123 | Manager |
| user | user123 | User |

## 🔧 Konfiguration

### Wichtige Umgebungsvariablen

```bash
# Backend (KRITISCH)
JWT_SECRET=nUZhjARF7Cy8TdQ8lHzQjXnAK5SibDEjXOYjyXxVrT8=

# Optional
NODE_ENV=production
CORS_ORIGIN=https://ihre-domain.com
CORS_CREDENTIALS=true
```

## 📁 Projektstruktur

```
Skillbox/
├── frontend/                 # React Frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/                  # Node.js Backend
│   ├── src/
│   ├── migrations/
│   └── package.json
├── docker/                   # Docker Konfiguration
│   ├── Dockerfile.frontend
│   └── Dockerfile.backend
├── docker-compose.prod.yml   # Produktions-Deployment
├── DEPLOYMENT.md            # Detaillierte Deployment-Anleitung
└── README.md               # Diese Datei
```

## 🛠️ Entwicklung

### Verfügbare Scripts

**Frontend:**
```bash
npm run dev          # Entwicklungsserver
npm run build        # Produktions-Build
npm run preview      # Preview des Builds
```

**Backend:**
```bash
npm run dev          # Entwicklungsserver mit nodemon
npm start           # Produktionsstart
npm run build       # TypeScript kompilieren
```

## 🐳 Docker

### Images builden

```bash
# Backend für Production (linux/amd64)
docker build --platform linux/amd64 -f docker/Dockerfile.backend -t skillbox-backend .

# Frontend für Production (linux/amd64)  
docker build --platform linux/amd64 -f docker/Dockerfile.frontend -t skillbox-frontend .
```

## 📊 Aktuelle Production Images

- **Backend**: `ghcr.io/carstenrossi/skillbox-backend:20250602-134035`
- **Frontend**: `ghcr.io/carstenrossi/skillbox-frontend:20250602-134457`

## 🤝 Contributing

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/amazing-feature`)
3. Committe deine Änderungen (`git commit -m 'Add amazing feature'`)
4. Push zum Branch (`git push origin feature/amazing-feature`)
5. Öffne einen Pull Request

## 📝 Lizenz

Dieses Projekt steht unter der [MIT Lizenz](LICENSE).

## 🆘 Support

Bei Problemen:
1. Prüfen Sie die [Deployment-Dokumentation](./DEPLOYMENT.md)
2. Schauen Sie in die Container-Logs: `docker logs skillbox-backend-1`
3. Öffnen Sie ein Issue im GitHub Repository

---
**Status**: ✅ Production Ready | **Letzte Aktualisierung**: 2025-06-02 