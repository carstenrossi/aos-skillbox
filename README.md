# Skillbox AI Assistant Platform

Eine moderne Plattform zur Verwaltung und Interaktion mit AI-Assistenten, entwickelt mit React, Node.js und AssistantOS Integration.

## 🚀 Features

- **Multi-Assistant Management**: Verwaltung mehrerer AI-Assistenten mit individuellen Konfigurationen
- **JWT Token Authentifizierung**: Sichere Authentifizierung für AssistantOS API
- **Persistent Storage**: Automatische Speicherung von Assistenten-Konfigurationen in JSON-Dateien
- **Admin Panel**: Vollständige CRUD-Operationen für Assistenten-Verwaltung
- **Rollenbasierte Authentifizierung**: Admin, Manager und User Rollen
- **Real-time Chat Interface**: Moderne Chat-Oberfläche mit Streaming-Unterstützung
- **Responsive Design**: Optimiert für Desktop und Mobile

## 🏗️ Architektur

### Frontend (React + TypeScript)
- **Framework**: React 18 mit TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Build Tool**: Create React App

### Backend (Node.js + Express)
- **Framework**: Express.js mit TypeScript
- **Authentication**: JWT Tokens
- **Data Storage**: JSON-basierte Persistenz
- **API Integration**: AssistantOS Chat Completions API
- **CORS**: Konfiguriert für Frontend-Integration

## 📦 Installation

### Prerequisites
- Node.js (v18 oder höher)
- npm oder yarn

### Backend Setup
```bash
cd backend
npm install
npm run build
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## 🔧 Konfiguration

### Environment Variables
Erstelle eine `.env` Datei im Backend-Verzeichnis:

```
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key
ASSISTANT_OS_API_KEY=your-assistant-os-api-key
```

### Standard Login-Daten
- **Admin**: admin / admin123
- **Manager**: manager / manager123
- **User**: user / user123

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/login` - Benutzer-Login

### Assistants
- `GET /api/assistants` - Alle Assistenten abrufen
- `POST /api/assistants` - Neuen Assistenten erstellen
- `PUT /api/assistants/:id` - Assistenten aktualisieren
- `DELETE /api/assistants/:id` - Assistenten löschen

### Conversations
- `POST /api/conversations` - Neue Konversation starten
- `POST /api/conversations/:id/messages` - Nachricht senden

## 📊 Datenmodell

### Assistant
```typescript
interface Assistant {
  id: string;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  api_url: string;
  jwt_token: string;
  model_name: string;
  system_prompt: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

## 🔒 Sicherheit

- **JWT Token Verschlüsselung**: Alle API-Tokens werden sicher gespeichert
- **CORS Konfiguration**: Beschränkt auf Frontend-Domain
- **Input Validation**: Vollständige Validierung aller API-Eingaben
- **Rate Limiting**: Schutz vor API-Missbrauch

## 📁 Projektstruktur

```
Skillbox/
├── backend/
│   ├── src/
│   │   ├── models/          # Datenmodelle
│   │   ├── routes/          # API Routes
│   │   ├── middleware/      # Auth & Validation
│   │   └── server.ts        # Express Server
│   ├── data/               # JSON Persistenz (gitignored)
│   └── dist/               # Compiled JS (gitignored)
├── frontend/
│   ├── src/
│   │   ├── components/     # React Komponenten
│   │   ├── hooks/          # Custom Hooks
│   │   ├── services/       # API Services
│   │   └── types/          # TypeScript Types
│   └── build/              # Build Output (gitignored)
└── README.md
```

## 🚦 Status

✅ **Backend Server**: Läuft auf Port 3001  
✅ **Frontend Client**: Läuft auf Port 3000  
✅ **Assistant Management**: Vollständig implementiert  
✅ **JWT Authentication**: Funktional  
✅ **Persistent Storage**: Automatische JSON-Speicherung  
✅ **Chat Interface**: Real-time Kommunikation  

## 📝 Development Notes

- Alle Assistenten werden automatisch in `backend/data/assistants.json` gespeichert
- Default-Assistenten werden beim ersten Start erstellt
- JWT Tokens werden sicher verwaltet und sind nicht im Frontend sichtbar
- CORS ist für localhost:3000 (Frontend) und localhost:3001 (Backend) konfiguriert

## 🤝 Contributing

Dieses Projekt ist proprietär und akzeptiert keine externen Beiträge. Alle Entwicklungsarbeiten werden intern durchgeführt.

## 📄 Lizenz

**PROPRIETÄRE SOFTWARE - ALLE RECHTE VORBEHALTEN**

© 2025 Carsten Rossi. Alle Rechte vorbehalten.

Diese Software und der zugehörige Quellcode sind proprietäres Eigentum von Carsten Rossi. Die Verwendung, Vervielfältigung, Verteilung oder Modifikation dieser Software ist ohne ausdrückliche schriftliche Genehmigung des Eigentümers strengstens untersagt.

### Nutzungsbedingungen:
- **Kommerzielle Nutzung**: Ausschließlich mit schriftlicher Genehmigung von Carsten Rossi
- **Vervielfältigung**: Nur für autorisierte Entwicklungs- und Testzwecke
- **Modifikation**: Nur durch autorisierte Entwickler gestattet
- **Verteilung**: Vollständig untersagt ohne Genehmigung
- **Reverse Engineering**: Strengstens verboten

### Haftungsausschluss:
Diese Software wird "wie besehen" bereitgestellt, ohne jegliche Gewährleistung. Der Eigentümer übernimmt keine Haftung für Schäden, die durch die Nutzung dieser Software entstehen.

Für Lizenzanfragen oder kommerzielle Nutzung kontaktieren Sie: Carsten Rossi

## 👨‍💻 Author

Entwickelt von Carsten Rossi - AI Assistant Platform

---

**Letzte Aktualisierung**: 31. Mai 2025 