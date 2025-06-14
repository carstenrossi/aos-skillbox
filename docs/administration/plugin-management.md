# Plugin-Verwaltung für Administratoren

## Übersicht

Das Skillbox-System verfügt über ein fortschrittliches Plugin-System mit automatischer bidirektionaler Synchronisation. Diese Dokumentation erklärt, wie Administratoren Plugins verwalten und die Synchronisation überwachen können.

## Plugin-Architektur

### Bidirektionale Synchronisation

Das System synchronisiert Plugins automatisch zwischen zwei Quellen:

1. **Plugin-Dateien** (`backend/plugins/*.json`) ↔ **Datenbank**
2. **Datenbank** ↔ **Plugin-Dateien** (für von Admins erstellte Plugins)

### Automatische Migration

Bei jedem Server-Start wird automatisch eine Plugin-Migration durchgeführt:

```
🔌 Starting plugin migration...
📁 Found 4 plugin files in directory
💾 Found 4 existing plugins in database
✅ All file plugins are up to date, no import needed
✅ All database plugins already have files, no export needed
🎉 Plugin synchronization completed successfully
```

## Plugin-Verwaltung

### 1. Verfügbare Plugins anzeigen

**Via Admin Panel:**
- Navigiere zu "Plugin-Verwaltung"
- Alle aktiven und inaktiven Plugins werden angezeigt

**Via API:**
```bash
curl -X GET http://localhost:3001/api/admin/plugins \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 2. Neues Plugin erstellen

**Via Admin Panel:**
1. Klicke auf "Neues Plugin erstellen"
2. Fülle die Plugin-Informationen aus:
   - Name und Anzeigename
   - Beschreibung und Version
   - Plugin-Typ und Runtime-Typ
   - Konfigurationsschema
   - Plugin-Manifest (JSON)

**Via API:**
```bash
curl -X POST http://localhost:3001/api/admin/plugins \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my_custom_plugin",
    "display_name": "Mein Custom Plugin",
    "description": "Ein benutzerdefiniertes Plugin",
    "version": "1.0.0",
    "author": "Admin",
    "plugin_type": "api_tool",
    "runtime_type": "api_call",
    "config_schema": {},
    "manifest": {
      "runtime": "nodejs",
      "functions": [...]
    }
  }'
```

### 3. Plugin-Synchronisation

#### Automatische Synchronisation

Die Synchronisation erfolgt automatisch:
- **Beim Server-Start**: Vollständige bidirektionale Synchronisation
- **Nach Plugin-Erstellung**: Automatischer Export zur JSON-Datei
- **Bei neuen Plugin-Dateien**: Automatischer Import in die Datenbank

#### Manuelle Synchronisation

**Via Admin Panel:**
- Navigiere zu "Plugin-Verwaltung" → "Synchronisation"
- Klicke auf "Plugins synchronisieren"

**Via API:**
```bash
curl -X POST http://localhost:3001/api/admin/plugins/sync \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Antwort:**
```json
{
  "success": true,
  "data": {
    "imported": 2,
    "exported": 1,
    "errors": [],
    "message": "Successfully synchronized 3 plugins"
  },
  "timestamp": "2025-06-14T18:09:54.954Z"
}
```

## Plugin-Dateien

### Verzeichnisstruktur

```
backend/plugins/
├── elevenlabs_tts.json           # Text-to-Speech Plugin
├── flux_image_generator.json     # Bildgenerierung
├── flux_pixar_generator.json     # Pixar-Style Bilder
├── google_keyword_generator.json # Keyword Research (auto-exportiert)
└── templates/                    # Vorlagen (werden ignoriert)
    └── example_plugin.json
```

### Plugin-Datei Format

```json
{
  "id": "my_plugin",
  "name": "my_plugin",
  "display_name": "Mein Plugin",
  "description": "Plugin-Beschreibung",
  "version": "1.0.0",
  "author": "Entwickler",
  "plugin_type": "api_tool",
  "runtime_type": "api_call",
  "config_schema": {
    "type": "object",
    "properties": {
      "api_key": {
        "type": "string",
        "description": "API-Schlüssel"
      }
    }
  },
  "manifest": {
    "runtime": "nodejs",
    "functions": [
      {
        "name": "my_function",
        "description": "Funktionsbeschreibung",
        "parameters": {
          "type": "object",
          "properties": {
            "input": {
              "type": "string",
              "description": "Eingabe"
            }
          }
        }
      }
    ]
  }
}
```

## Deployment-Szenarien

### Szenario 1: Neue Plugin-Dateien hinzufügen

1. **Entwicklung**: Plugin-JSON-Datei in `backend/plugins/` erstellen
2. **Deployment**: Container-Build mit neuer Plugin-Datei
3. **Server-Start**: Plugin wird automatisch in Datenbank importiert
4. **Ergebnis**: Plugin ist für alle Benutzer verfügbar

### Szenario 2: Admin erstellt Plugin über UI

1. **Admin-Aktion**: Plugin über Admin Panel erstellen
2. **Automatischer Export**: Plugin wird als JSON-Datei exportiert
3. **Nächstes Deployment**: JSON-Datei ist im Container enthalten
4. **Ergebnis**: Plugin überlebt alle zukünftigen Deployments

### Szenario 3: Plugin-Update

1. **Datei-Update**: Plugin-JSON-Datei aktualisieren
2. **Deployment**: Neuer Container mit aktualisierter Datei
3. **Server-Start**: Bestehende Plugin-Konfiguration bleibt erhalten
4. **Manuelle Sync**: Bei Bedarf manuelle Synchronisation durchführen

## Monitoring und Troubleshooting

### Log-Überwachung

**Plugin-Migration Logs:**
```bash
# Container-Logs anzeigen
docker logs skillbox-backend | grep -E "(🔌|plugin|Plugin)"

# Spezifische Plugin-Logs
docker logs skillbox-backend | grep "Plugin migration"
```

**Typische Log-Ausgaben:**
```
2025-06-14 20:09:54:954 info: 🔌 Starting plugin migration...
2025-06-14 20:09:54:954 debug: 🔍 Plugin elevenlabs_tts: exists=true
2025-06-14 20:09:54:954 info: 📁 Found 4 plugin files in directory
2025-06-14 20:09:54:954 info: 💾 Found 4 existing plugins in database
2025-06-14 20:09:54:954 info: ✅ All file plugins are up to date, no import needed
2025-06-14 20:09:54:954 info: ✅ All database plugins already have files, no export needed
2025-06-14 20:09:54:954 info: 🎉 Plugin synchronization completed successfully
```

### Häufige Probleme

#### Problem: Plugin wird nicht importiert

**Ursachen:**
- Fehlerhafte JSON-Syntax
- Fehlende Pflichtfelder
- Ungültiges Plugin-Manifest

**Lösung:**
1. Plugin-JSON-Datei validieren
2. Logs auf Fehlermeldungen prüfen
3. Plugin-Schema überprüfen

#### Problem: Plugin verschwindet nach Deployment

**Ursache:** Plugin wurde nur in Datenbank erstellt, aber nicht exportiert

**Lösung:**
1. Manuelle Synchronisation durchführen
2. Überprüfen, ob JSON-Datei erstellt wurde
3. Bei nächstem Deployment ist Plugin verfügbar

#### Problem: Synchronisation schlägt fehl

**Debugging:**
```bash
# Detaillierte Logs aktivieren
docker exec skillbox-backend tail -f logs/app.log | grep -E "(plugin|error)"

# Plugin-Verzeichnis überprüfen
docker exec skillbox-backend ls -la /app/plugins/

# Datenbank-Status überprüfen
curl http://localhost:3001/api/admin/plugins/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Sicherheit und Audit

### Audit-Logging

Alle Plugin-Verwaltungsaktionen werden automatisch geloggt:

- Plugin-Erstellung
- Plugin-Updates
- Plugin-Aktivierung/Deaktivierung
- Manuelle Synchronisationen

### Berechtigungen

- **Super-Admin**: Vollzugriff auf Plugin-Verwaltung
- **Admin**: Kann Plugins anzeigen und synchronisieren
- **Benutzer**: Können nur verfügbare Plugins verwenden

### Backup-Integration

Plugin-Änderungen werden automatisch in den täglichen Backups gespeichert:

```bash
# Backup-Status überprüfen
curl http://localhost:3001/api/admin/backups \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Best Practices

### 1. Plugin-Entwicklung

- **Versionierung**: Immer Versionsnummern verwenden
- **Dokumentation**: Ausführliche Beschreibungen hinzufügen
- **Testing**: Plugins vor Deployment testen
- **Schema-Validierung**: Konfigurationsschemas definieren

### 2. Deployment

- **Staging**: Plugins zuerst in Staging-Umgebung testen
- **Rollback**: Backup vor Plugin-Updates erstellen
- **Monitoring**: Logs nach Deployment überwachen
- **Dokumentation**: Änderungen dokumentieren

### 3. Wartung

- **Regelmäßige Synchronisation**: Bei Problemen manuelle Sync durchführen
- **Log-Überwachung**: Plugin-Logs regelmäßig überprüfen
- **Backup-Verifikation**: Backups regelmäßig testen
- **Update-Zyklen**: Plugin-Updates koordinieren

## API-Referenz

### Plugin-Verwaltung Endpoints

```bash
# Alle Plugins auflisten
GET /api/admin/plugins

# Plugin erstellen
POST /api/admin/plugins

# Plugin aktualisieren
PUT /api/admin/plugins/:id

# Plugin löschen
DELETE /api/admin/plugins/:id

# Plugin aktivieren/deaktivieren
PATCH /api/admin/plugins/:id/toggle

# Plugin-Synchronisation
POST /api/admin/plugins/sync

# Plugin-Status
GET /api/admin/plugins/status
```

Alle Endpoints erfordern Admin-Authentifizierung via JWT-Token. 