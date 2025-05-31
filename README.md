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

1. Fork das Repository
2. Erstelle einen Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Erstelle einen Pull Request

## 📄 License

Dieses Projekt ist unter der MIT License lizenziert.

## 👨‍💻 Author

Entwickelt von Carsten Rossi - AI Assistant Platform

---

**Letzte Aktualisierung**: 31. Mai 2025 