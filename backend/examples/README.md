# Plugin-Beispiele

Hier finden Sie vorgefertigte Plugin-JSON-Definitionen, die Sie direkt im Admin Panel importieren können.

## 📁 Verfügbare Templates

### 🎨 **Bildgenerierung**

#### **Flux Pro (fal.ai)**
```bash
flux-plugin-example.json
```
- **Service:** fal.ai
- **Model:** flux-pro/v1.1-ultra
- **API Key:** Benötigt fal.ai Account
- **Funktionen:** Hochqualitative Bildgenerierung

**Verwendung:**
1. JSON kopieren: `cat flux-plugin-example.json`
2. Im Admin Panel: "Plugins" → "Neues Plugin" → "JSON Import"
3. JSON einfügen und importieren
4. API Key konfigurieren: `fal_xxx...` von fal.ai

### 🎤 **Audio-Generierung**

#### **ElevenLabs Text-to-Speech**
```bash
elevenlabs-plugin-example.json
```
- **Service:** ElevenLabs
- **Funktionen:** Text-to-Speech mit AI-Stimmen
- **API Key:** Benötigt ElevenLabs Account
- **Stimmen:** Rachel, Adam, Bella, Antoni, Elli, Josh, Arnold, Domi, Sam

**Verwendung:**
1. JSON kopieren: `cat elevenlabs-plugin-example.json`
2. Import über Admin Panel
3. API Key konfigurieren: `sk_xxx...` von elevenlabs.io

### 🔗 **Automatisierungen & Webhooks**

#### **N8N Workflow Automation**
```bash
n8n-automation-example.json
```
- **Service:** N8N (Self-hosted oder Cloud)
- **Runtime:** webhook
- **Funktionen:** Workflow-Trigger, Notifications, Task-Erstellung
- **Setup:** N8N Webhook-URL aus Workflow

**Verwendung:**
1. **N8N Workflow erstellen** mit Webhook-Trigger
2. **Webhook-URL kopieren** (z.B. `https://your-n8n.com/webhook/abc123`)
3. JSON importieren und Webhook-URL konfigurieren
4. Optional: Authentication Headers setzen

#### **Zapier Webhook Integration**
```bash
zapier-webhook-example.json
```
- **Service:** Zapier
- **Runtime:** webhook
- **Funktionen:** Zap-Trigger, Google Sheets, Calendar Events
- **Setup:** Zapier "Webhooks by Zapier" Trigger

**Verwendung:**
1. **Zapier Zap erstellen** mit "Webhooks by Zapier" Trigger
2. **Webhook-URL kopieren** (z.B. `https://hooks.zapier.com/hooks/catch/12345/abcdef/`)
3. JSON importieren und URL konfigurieren
4. Zap aktivieren

#### **Make.com Scenario Automation**
```bash
make-automation-example.json
```
- **Service:** Make.com (ehemals Integromat)
- **Runtime:** webhook
- **Funktionen:** Scenario-Trigger, Multi-Platform Sync, Content Workflows
- **Setup:** Make.com "Custom Webhook" Trigger

**Verwendung:**
1. **Make.com Scenario erstellen** mit "Custom webhook" Trigger
2. **Webhook-URL kopieren** (z.B. `https://hook.eu1.make.com/abc123def456789`)
3. JSON importieren und URL konfigurieren
4. Scenario aktivieren und testen

**Besonderheiten:**
- **Komplexe Datenstrukturen** für verschachtelte Workflows
- **Erweiterte Error Handling** mit Retry-Mechanismen
- **Multi-Platform Synchronisation** zwischen verschiedenen Services
- **Content-Workflow-Management** für Marketing-Teams

## 🚀 Schnellstart

### **1. Plugin importieren**
```bash
# Ins Admin Panel gehen
http://localhost:3000 → Plugins Tab → "Neues Plugin erstellen"

# JSON Import klicken
# Eine der JSON-Dateien kopieren und einfügen
```

### **2. Plugin konfigurieren**
```bash
# Nach dem Import: "Configure" Button klicken
# API Keys eintragen
# Weitere Einstellungen anpassen
```

### **3. Plugin aktivieren**
```bash
# Status-Toggle auf "Active" setzen
# Plugin ist jetzt verfügbar
```

## 📖 Eigene Plugins erstellen

Basis-Template für neue Plugins:

```json
{
  "name": "my_plugin",
  "display_name": "Mein Plugin",
  "description": "Beschreibung des Plugins",
  "version": "1.0.0",
  "author": "Ihr Name",
  "plugin_type": "utility",
  "runtime_type": "api_call",
  "config_schema": {
    "api_key": {
      "type": "string",
      "required": true,
      "secret": true,
      "title": "API Key"
    }
  },
  "manifest": {
    "functions": [
      {
        "name": "my_function",
        "description": "Meine Funktion",
        "parameters": {
          "input": {
            "type": "string",
            "required": true,
            "description": "Eingabe-Text"
          }
        }
      }
    ]
  }
}
```

## 🔗 Weitere Ressourcen

- [Plugin JSON-Import Dokumentation](../docs/PLUGIN_JSON_IMPORT.md)
- [Plugin System Übersicht](../PLUGIN_SYSTEM.md)
- [API-Dokumentation der Services](../docs/PLUGIN_JSON_IMPORT.md#-quellen-für-plugin-jsons) 