# 🔧 Skillbox Backend

## 📋 Übersicht

Das **Skillbox Backend** ist ein Node.js/TypeScript-basierter Server, der die API für das Skillbox AI-Assistant-System bereitstellt.

## 🏗️ Architektur

### **Hauptkomponenten:**
- **Express.js Server** - REST API und WebSocket-Unterstützung
- **SQLite Datenbank** - Benutzer, Assistenten, Conversations, Plugins
- **Plugin System** - Modulare Erweiterungen für AI-Funktionalitäten
- **JWT Authentication** - Sichere Benutzer-Authentifizierung
- **E-Mail Service** - Brevo SMTP für Benachrichtigungen

### **Ordnerstruktur:**
```
backend/
├── 📁 src/                    # TypeScript Quellcode
│   ├── 📁 controllers/        # API Route Handler
│   ├── 📁 services/           # Business Logic
│   ├── 📁 models/             # Datenbank Models
│   ├── 📁 middleware/         # Express Middleware
│   ├── 📁 routes/             # API Routes
│   └── 📁 config/             # Konfiguration
├── 📁 plugins/                # Plugin-Definitionen (JSON)
│   ├── 📄 flux_pixar_generator.json
│   ├── 📄 flux_image_generator.json
│   ├── 📄 elevenlabs_tts.json
│   └── 📄 plugin_template.json
├── 📁 examples/               # Code-Beispiele
├── 📁 data/                   # SQLite Datenbank
└── 📁 migrations/             # Datenbank-Migrationen
```

## 🚀 Schnellstart

### **Development:**
```bash
cd backend
npm install
npm run dev
```

### **Production:**
```bash
npm run build
npm start
```

### **Docker:**
```bash
# Development
docker-compose -f docker-compose.dev.yml up -d

# Production  
docker-compose -f docker-compose.prod.yml up -d
```

## 🔌 Plugin System

Das Backend unterstützt ein **modulares Plugin-System** für AI-Funktionalitäten:

- **Plugin-Definitionen:** `plugins/*.json`
- **Plugin-Templates:** `plugins/plugin_template.json`
- **Dokumentation:** Siehe [Plugin-Guides](../docs/plugin-guides/)

### **Verfügbare Plugins:**
- 🎨 **Flux Image Generator** - AI-Bildgenerierung
- 🎬 **Flux Pixar Generator** - Pixar-Style Bilder mit LORA
- 🔊 **ElevenLabs TTS** - Text-to-Speech

## 📊 API Endpunkte

### **Authentifizierung:**
- `POST /api/auth/login` - Benutzer-Anmeldung
- `POST /api/auth/register` - Benutzer-Registrierung
- `POST /api/auth/logout` - Abmeldung

### **Assistenten:**
- `GET /api/assistants` - Alle Assistenten
- `POST /api/assistants` - Neuen Assistant erstellen
- `PUT /api/assistants/:id` - Assistant bearbeiten

### **Conversations:**
- `GET /api/conversations` - Conversation-Liste
- `POST /api/conversations` - Neue Conversation
- `POST /api/conversations/:id/messages` - Nachricht senden

### **Plugins:**
- `GET /api/plugins` - Alle Plugins
- `POST /api/plugins` - Plugin installieren
- `PUT /api/plugins/:id/config` - Plugin konfigurieren

### **Admin:**
- `GET /api/admin/users` - Benutzer-Verwaltung
- `POST /api/admin/users` - Benutzer erstellen
- `PUT /api/admin/users/:id` - Benutzer bearbeiten

## 🔧 Konfiguration

### **Environment-Variablen:**
```bash
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_PATH=./data/skillbox.db

# JWT
JWT_SECRET=your-secret-key

# CORS
CORS_ORIGIN=http://localhost:3000

# E-Mail (optional)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
```

### **Konfigurationsdateien:**
- `src/config/env.development.ts` - Development-Einstellungen
- `src/config/env.production.ts` - Production-Einstellungen

## 🧪 Testing

```bash
# Unit Tests
npm test

# Integration Tests
npm run test:integration

# Coverage Report
npm run test:coverage
```

## 📚 Dokumentation

- **Setup & Installation:** [../docs/setup/](../docs/setup/)
- **Plugin-Entwicklung:** [../docs/plugin-guides/](../docs/plugin-guides/)
- **Development-Guides:** [../docs/development/](../docs/development/)
- **Administration:** [../docs/administration/](../docs/administration/)

## 🔍 Health Check

```bash
curl http://localhost:3001/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-06-14T16:00:00.000Z",
  "version": "1.0.0",
  "environment": "development",
  "database": "SQLite connected"
}
```

## 🐛 Troubleshooting

### **Häufige Probleme:**
1. **Port bereits in Verwendung:** `lsof -ti:3001 | xargs kill -9`
2. **Datenbank-Fehler:** Prüfen Sie `data/skillbox.db` Berechtigungen
3. **Plugin-Fehler:** Validieren Sie JSON-Syntax in `plugins/`

### **Logs:**
```bash
# Development
npm run dev  # Logs in Console

# Production
pm2 logs skillbox-backend
```

---

**🚀 Das Skillbox Backend ist bereit für AI-powered Conversations!** 