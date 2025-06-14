# 🔌 Skillbox Plugin System

## Übersicht

Das Skillbox Plugin-System ermöglicht es, AI-Assistenten mit zusätzlichen Funktionen auszustatten, wie z.B. Bildgenerierung, Audio-/Videogenerierung oder Automatisierungen. Das System ist inspiriert von Open WebUI und bietet eine sichere, erweiterbare Architektur.

### 🚀 **Neu: JSON-Import System**
Komplexe Plugins können jetzt über **JSON-Import** erstellt werden! 
📖 **Siehe:** [Plugin JSON-Import Dokumentation](./docs/PLUGIN_JSON_IMPORT.md)

## 🏗️ Architektur

### Plugin-Typen
- **Image Generation** - Bildgenerierung (Flux, DALL-E, Midjourney)
- **Audio Generation** - Audio-Erzeugung (ElevenLabs, OpenAI TTS)
- **Video Generation** - Video-Erstellung (RunwayML, Pika Labs)
- **Automation** - Workflow-Automatisierung (n8n, Zapier, Make.com)
- **API Tool** - Beliebige REST/GraphQL APIs
- **Custom** - Benutzerdefinierte Plugins

### Runtime-Typen
- **api_call** - HTTP-basierte API-Aufrufe (empfohlen)
- **nodejs** - Direkte Node.js-Ausführung
- **python** - Python-Skripte via subprocess
- **webhook** - Webhook-basierte Ausführung

## 📊 Datenbank-Schema

### Plugins Tabelle
```sql
CREATE TABLE plugins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',
  author TEXT,
  plugin_type TEXT NOT NULL,
  runtime_type TEXT NOT NULL,
  config_schema TEXT, -- JSON
  manifest TEXT NOT NULL, -- JSON
  is_active BOOLEAN DEFAULT 1,
  is_public BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  updated_by TEXT
);
```

### Plugin-Konfigurationen
```sql
CREATE TABLE plugin_configs (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  user_id TEXT, -- NULL = global config
  config_data TEXT NOT NULL, -- JSON
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Assistant-Plugin Zuordnungen
```sql
CREATE TABLE assistant_plugins (
  id TEXT PRIMARY KEY,
  assistant_id TEXT NOT NULL,
  plugin_id TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  config_override TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assistant_id) REFERENCES assistants(id) ON DELETE CASCADE,
  FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
);
```

### Plugin-Ausführungsprotokoll
```sql
CREATE TABLE plugin_executions (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  assistant_id TEXT,
  conversation_id TEXT,
  user_id TEXT NOT NULL,
  function_name TEXT NOT NULL,
  input_parameters TEXT, -- JSON
  output_result TEXT, -- JSON
  status TEXT NOT NULL, -- pending, running, completed, failed, cancelled
  error_message TEXT,
  execution_time_ms INTEGER,
  cost_cents INTEGER,
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
);
```

## 📝 Plugin-Manifest Format

```json
{
  "name": "plugin_name",
  "display_name": "Plugin Display Name",
  "version": "1.0.0",
  "description": "Plugin description",
  "author": "Author Name",
  "runtime": "api_call",
  "functions": [
    {
      "name": "function_name",
      "description": "Function description",
      "parameters": {
        "param1": {
          "type": "string",
          "required": true,
          "description": "Parameter description"
        },
        "param2": {
          "type": "enum",
          "values": ["option1", "option2"],
          "default": "option1",
          "description": "Enum parameter"
        }
      }
    }
  ],
  "config_schema": {
    "api_key": {
      "type": "string",
      "required": true,
      "secret": true,
      "description": "API key for the service"
    },
    "timeout": {
      "type": "number",
      "default": 30,
      "description": "Request timeout in seconds"
    }
  },
  "endpoints": {
    "execute": "https://api.example.com/execute",
    "health": "https://api.example.com/health"
  },
  "permissions": ["internet_access", "api_calls"],
  "metadata": {
    "category": "Image Generation",
    "tags": ["ai", "image"],
    "cost_model": "per_request"
  }
}
```

## 🔧 API Endpoints

### Plugin-Verwaltung
```
GET    /api/plugins              - Liste aller Plugins
GET    /api/plugins/:id          - Plugin-Details
POST   /api/plugins              - Plugin erstellen
PUT    /api/plugins/:id          - Plugin aktualisieren
DELETE /api/plugins/:id          - Plugin löschen
```

### Plugin-Konfiguration
```
GET    /api/plugins/:id/config   - Plugin-Konfiguration abrufen
POST   /api/plugins/:id/config   - Plugin-Konfiguration setzen
```

### Assistant-Plugin Zuordnung
```
GET    /api/assistants/:id/plugins     - Plugins eines Assistants
POST   /api/assistants/:id/plugins     - Plugin zu Assistant hinzufügen
DELETE /api/assistants/:id/plugins/:pid - Plugin von Assistant entfernen
```

## 🚀 Plugin-Entwicklung

### 1. Plugin-Manifest erstellen
```json
{
  "name": "my_plugin",
  "display_name": "My Plugin",
  "version": "1.0.0",
  "runtime": "api_call",
  "functions": [
    {
      "name": "my_function",
      "description": "My function description",
      "parameters": {
        "input": {
          "type": "string",
          "required": true,
          "description": "Input text"
        }
      }
    }
  ]
}
```

### 2. Plugin registrieren
```bash
curl -X POST http://localhost:3001/api/plugins \
  -H "Content-Type: application/json" \
  -d @my-plugin.json
```

### 3. Plugin konfigurieren
```bash
curl -X POST http://localhost:3001/api/plugins/{plugin_id}/config \
  -H "Content-Type: application/json" \
  -d '{"api_key": "your-api-key"}'
```

### 4. Plugin zu Assistant zuweisen
```bash
curl -X POST http://localhost:3001/api/assistants/{assistant_id}/plugins \
  -H "Content-Type: application/json" \
  -d '{"plugin_id": "{plugin_id}", "is_enabled": true}'
```

## 📋 Beispiel-Plugins

### Flux Image Generator
Siehe: `backend/examples/flux-plugin-example.json`

Funktionen:
- `image_gen(prompt, aspect_ratio, num_images, raw)` - Bildgenerierung

Konfiguration:
- `api_key` - fal.ai API Key
- `model_name` - Flux-Modell (default: flux-pro/v1.1-ultra)
- `safety_tolerance` - Sicherheitsstufe (1-5)

### N8N Automation Plugin (geplant)
```json
{
  "name": "n8n_automation",
  "display_name": "n8n Automation",
  "runtime": "api_call",
  "functions": [
    {
      "name": "trigger_workflow",
      "description": "Trigger an n8n workflow",
      "parameters": {
        "workflow_id": {"type": "string", "required": true},
        "data": {"type": "object", "required": false}
      }
    }
  ]
}
```

## 🔒 Sicherheit

### Plugin-Isolation
- Plugins laufen in isolierten Kontexten
- Keine direkten Dateisystem-Zugriffe
- Rate Limiting pro Plugin
- Resource Limits (Timeout, Memory)

### Konfigurationssicherheit
- API-Keys werden verschlüsselt gespeichert
- User-spezifische vs. globale Konfigurationen
- Rollen-basierte Zugriffskontrolle

### Validierung
- Plugin-Manifest-Validierung
- Parameter-Typen-Prüfung
- Input-Sanitization

## 📈 Monitoring & Logging

### Plugin-Ausführungsprotokoll
- Alle Plugin-Aufrufe werden protokolliert
- Performance-Metriken (Ausführungszeit)
- Fehler-Tracking
- Kosten-Tracking

### Health Checks
- Plugin-Verfügbarkeit prüfen
- API-Endpoint-Status
- Automatische Deaktivierung bei Fehlern

## 🔄 Migration & Rollout

### Sichere Einführung
1. **Phase 1**: Database Migrations (✅ Implementiert)
2. **Phase 2**: Backend API (✅ Implementiert)
3. **Phase 3**: Admin Interface (🔄 In Planung)
4. **Phase 4**: Chat Integration (🔄 In Planung)
5. **Phase 5**: Plugin Store (🔄 In Planung)

### Backwards Compatibility
- Bestehende Assistants bleiben unverändert
- Neue Plugin-Tabellen sind optional
- Graceful Degradation bei Plugin-Fehlern

## 🛠️ Entwicklung & Testing

### Lokale Entwicklung
```bash
# Backend starten
cd backend && npm run dev

# Plugin testen
curl http://localhost:3001/api/plugins

# Migrations prüfen
# Neue Tabellen werden automatisch erstellt
```

### Plugin-Testing
```bash
# Plugin erstellen
POST /api/plugins

# Plugin-Konfiguration testen
POST /api/plugins/:id/config

# Plugin-Funktion ausführen (später)
POST /api/plugins/:id/execute
```

## 📚 Nächste Schritte

1. **Plugin-Execution Engine** - Ausführung von Plugin-Funktionen
2. **Admin Interface** - UI für Plugin-Verwaltung
3. **Chat Integration** - Function Calling im Chat
4. **Plugin Store** - Marketplace für Plugins
5. **Advanced Features** - Webhooks, Scheduling, Workflows

---

**Status**: ✅ Foundation implementiert (Database, Models, API)  
**Nächster Schritt**: Plugin-Execution Engine & Admin Interface 