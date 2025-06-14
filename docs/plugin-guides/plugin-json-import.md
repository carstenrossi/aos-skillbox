# Plugin JSON-Import System

## 🎯 Übersicht

Das **Plugin JSON-Import System** ermöglicht es, komplexe Plugin-Definitionen über JSON-Dateien zu erstellen, anstatt alle Felder manuell auszufüllen. Dies ist besonders nützlich für Plugins mit komplexen Konfigurationsschemas.

## 🚀 Verwendung

### **1. Plugin-Erstellungs-Modal öffnen**
1. Gehen Sie zum **Admin Panel** → **"Plugins" Tab**
2. Klicken Sie **"Neues Plugin erstellen"**
3. Klicken Sie **"JSON Import"** Button

### **2. JSON einfügen und importieren**
1. **Plugin-JSON** in das Textfeld einfügen
2. **"JSON importieren"** klicken
3. **Alle Formularfelder** werden automatisch ausgefüllt
4. **"Plugin erstellen"** klicken

## 📁 Quellen für Plugin-JSONs

### **A. Vorgefertigte Templates**
```bash
backend/examples/
├── flux-plugin-example.json        # Bildgenerierung (fal.ai)
├── elevenlabs-plugin-example.json   # Text-to-Speech (ElevenLabs)
└── weitere Templates...
```

### **B. API-Dokumentationen**
| Service | URL | Plugin-Typ |
|---------|-----|------------|
| **fal.ai** | https://fal.ai/models | Bild/Video-Generation |
| **ElevenLabs** | https://elevenlabs.io/docs | Text-to-Speech |
| **OpenAI** | https://platform.openai.com/docs | DALL-E, TTS, etc. |
| **Replicate** | https://replicate.com/explore | Verschiedene AI-Modelle |

### **C. Eigene JSON-Dateien erstellen**
Siehe [Plugin JSON Schema](#plugin-json-schema) unten.

## 📋 Plugin JSON Schema

### **Minimal-Beispiel**
```json
{
  "name": "my_plugin",
  "display_name": "Mein Plugin",
  "description": "Plugin-Beschreibung",
  "version": "1.0.0",
  "author": "Ihr Name",
  "plugin_type": "utility",
  "runtime_type": "api_call"
}
```

### **Vollständiges Beispiel**
```json
{
  "name": "elevenlabs_tts",
  "display_name": "ElevenLabs Text-to-Speech",
  "description": "Convert text to speech using ElevenLabs AI voices",
  "version": "1.0.0",
  "author": "Skillbox Team",
  "plugin_type": "audio_generation",
  "runtime_type": "api_call",
  "is_active": true,
  "is_public": true,
  
  "config_schema": {
    "api_key": {
      "type": "string",
      "required": true,
      "secret": true,
      "title": "ElevenLabs API Key",
      "description": "Your ElevenLabs API key from elevenlabs.io"
    },
    "voice_id": {
      "type": "enum",
      "required": false,
      "default": "21m00Tcm4TlvDq8ikWAM",
      "title": "Voice",
      "values": [
        "21m00Tcm4TlvDq8ikWAM",
        "AZnzlk1XvdvUeBnXmlld",
        "EXAVITQu4vr4xnSDxMaL"
      ]
    },
    "model_id": {
      "type": "enum", 
      "required": false,
      "default": "eleven_turbo_v2",
      "title": "TTS Model",
      "values": [
        "eleven_turbo_v2",
        "eleven_multilingual_v2", 
        "eleven_monolingual_v1"
      ]
    },
    "stability": {
      "type": "number",
      "required": false,
      "default": 0.5,
      "minimum": 0.0,
      "maximum": 1.0,
      "title": "Voice Stability"
    },
    "output_format": {
      "type": "enum",
      "required": false,
      "default": "mp3_44100_128",
      "title": "Audio Format",
      "values": [
        "mp3_22050_32",
        "mp3_44100_64",
        "mp3_44100_96",
        "mp3_44100_128",
        "mp3_44100_192",
        "pcm_16000",
        "pcm_22050",
        "pcm_24000",
        "pcm_44100"
      ]
    }
  },
  
  "manifest": {
    "name": "elevenlabs_tts",
    "display_name": "ElevenLabs Text-to-Speech",
    "description": "Convert text to speech using ElevenLabs AI voices",
    "version": "1.0.0",
    "author": "Skillbox Team",
    "plugin_type": "audio_generation",
    "runtime_type": "api_call",
    "functions": [
      {
        "name": "text_to_speech",
        "description": "Convert text to speech using ElevenLabs voices",
        "parameters": {
          "text": {
            "type": "string",
            "description": "Text to convert to speech",
            "required": true
          },
          "voice": {
            "type": "string", 
            "description": "Voice to use for speech synthesis",
            "required": false,
            "default": "Rachel"
          }
        }
      }
    ]
  }
}
```

## 🏗️ Schema-Felder Erklärung

### **Basis-Felder** (erforderlich)
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `name` | string | **Plugin-ID** (eindeutig, snake_case) |
| `display_name` | string | **Anzeigename** in der UI |
| `description` | string | **Beschreibung** des Plugins |
| `version` | string | **Versionsnummer** (z.B. "1.0.0") |
| `author` | string | **Autor/Ersteller** des Plugins |
| `plugin_type` | enum | **Plugin-Kategorie** (siehe unten) |
| `runtime_type` | enum | **Ausführungsart** (siehe unten) |

### **Plugin-Typen** (`plugin_type`)
- `image_generation` - Bildgenerierung
- `video_generation` - Videogenerierung  
- `audio_generation` - Audiogenerierung
- `automation` - Automatisierung (n8n, Zapier)
- `utility` - Hilfsfunktionen

### **Runtime-Typen** (`runtime_type`)
- `api_call` - Externe API aufrufen
- `nodejs` - Node.js Code ausführen
- `webhook` - Webhook triggern

### **Konfigurations-Schema** (`config_schema`)
Definiert, welche Konfigurationsfelder das Plugin benötigt:

#### **String-Felder**
```json
"api_key": {
  "type": "string",
  "required": true,
  "secret": true,           // Passwort-Feld
  "title": "API Key",
  "description": "Your API key"
}
```

#### **Auswahlfelder (Enum)**
```json
"model": {
  "type": "enum",
  "required": false,
  "default": "gpt-4",
  "title": "Model",
  "values": ["gpt-4", "gpt-3.5-turbo", "claude-3"]
}
```

#### **Zahlenfelder**
```json
"temperature": {
  "type": "number",
  "required": false,
  "default": 0.7,
  "minimum": 0.0,
  "maximum": 2.0,
  "title": "Temperature"
}
```

#### **Boolean-Felder**
```json
"enable_safety": {
  "type": "boolean",
  "required": false,
  "default": true,
  "title": "Enable Safety Check"
}
```

### **Plugin-Manifest** (`manifest`)
Definiert die verfügbaren Funktionen und Parameter:

```json
"manifest": {
  "functions": [
    {
      "name": "function_name",
      "description": "Function description",
      "parameters": {
        "param1": {
          "type": "string",
          "description": "Parameter description",
          "required": true
        }
      }
    }
  ]
}
```

## 🔧 Praktische Beispiele

### **1. Flux Bildgenerierung** (fal.ai)
```bash
# JSON kopieren aus:
cat backend/examples/flux-plugin-example.json
```

**Verwendung:**
- API Key: `fal_xxx...` (von fal.ai)
- Prompt: "Ein Sonnenuntergang über Bergen"
- Model: `flux-pro/v1.1-ultra`

### **2. ElevenLabs Text-to-Speech**
```bash
# JSON kopieren aus:
cat backend/examples/elevenlabs-plugin-example.json  
```

**Verwendung:**
- API Key: `sk_xxx...` (von elevenlabs.io)
- Text: "Hallo, das ist ein Test"
- Voice: Rachel, Adam, etc.

### **3. OpenAI DALL-E Plugin** (Beispiel)
```json
{
  "name": "openai_dalle",
  "display_name": "OpenAI DALL-E 3",
  "description": "Generate images using DALL-E 3",
  "version": "1.0.0",
  "author": "Skillbox Team",
  "plugin_type": "image_generation",
  "runtime_type": "api_call",
  "config_schema": {
    "api_key": {
      "type": "string",
      "required": true,
      "secret": true,
      "title": "OpenAI API Key"
    },
    "model": {
      "type": "enum",
      "default": "dall-e-3",
      "title": "Model",
      "values": ["dall-e-3", "dall-e-2"]
    },
    "size": {
      "type": "enum",
      "default": "1024x1024",
      "title": "Image Size",
      "values": ["1024x1024", "1792x1024", "1024x1792"]
    },
    "quality": {
      "type": "enum",
      "default": "standard",
      "title": "Quality",
      "values": ["standard", "hd"]
    }
  }
}
```

## 🧪 **Plugin Testing Guide**

### **🔗 N8N Webhook Testing**

#### **Quick Test mit Mock-Webhook:**
1. **Webhook.site öffnen:** https://webhook.site/
2. **Unique URL kopieren** (z.B. `https://webhook.site/abc123...`)
3. **N8N Plugin importieren** (siehe Beispiele)
4. **Mock-URL als Webhook-URL konfigurieren**
5. **Plugin-Funktion testen:**

```json
{
  "function": "send_notification",
  "parameters": {
    "recipient": "test@example.com",
    "subject": "Skillbox Test",
    "message": "Das N8N Plugin funktioniert!",
    "notification_type": "email"
  }
}
```

6. **Webhook.site prüfen** - eingehende Daten sichtbar

#### **Echter N8N Test:**
1. **N8N installieren:** `npm install n8n -g`
2. **N8N starten:** `n8n start` 
3. **Workflow erstellen** mit "Webhook" Trigger
4. **Webhook-URL kopieren**
5. **In Skillbox Plugin konfigurieren**

## ❗ Troubleshooting

### **Häufige Fehler**

#### **1. "JSON muss mindestens name, display_name und description enthalten"**
```json
// ❌ Falsch - Felder fehlen
{
  "name": "test_plugin"
}

// ✅ Richtig - Mindestfelder vorhanden
{
  "name": "test_plugin",
  "display_name": "Test Plugin", 
  "description": "Test-Beschreibung"
}
```

#### **2. "Ungültiges JSON Format"**
```json
// ❌ Falsch - Syntax-Fehler
{
  "name": "test_plugin",    // ← Komma fehlt
  "display_name": "Test"
  "description": "Test"     // ← Komma fehlt
}

// ✅ Richtig - Gültige JSON-Syntax
{
  "name": "test_plugin",
  "display_name": "Test",
  "description": "Test"
}
```

#### **3. Fehlende Anführungszeichen**
```json
// ❌ Falsch
{
  name: "test_plugin"       // ← Anführungszeichen fehlen
}

// ✅ Richtig  
{
  "name": "test_plugin"
}
```

### **JSON Validierung**
**Online JSON Validator:** https://jsonlint.com/

## 🎯 Best Practices

### **1. Plugin-Namen**
- **snake_case** verwenden: `flux_image_generator`
- **Eindeutig** und **beschreibend**
- **Service + Funktion** Pattern: `elevenlabs_tts`, `openai_dalle`

### **2. Konfiguration**
- **API Keys** immer als `secret: true` markieren
- **Sinnvolle Defaults** setzen
- **Enum-Werte** für bekannte Optionen verwenden

### **3. Dokumentation**
- **Klare Beschreibungen** für alle Felder
- **Beispiel-Werte** in Beschreibungen
- **Versionierung** beachten

## 📖 Nächste Schritte

Nach dem Plugin-Import:
1. **Plugin-Konfiguration** ausfüllen (API Keys, etc.)
2. **Plugin aktivieren** (Status-Toggle)
3. **Plugin testen** über Chat-Integration
4. **Plugin einem Assistant zuweisen**

## 🔗 Weiterführende Links

- [Plugin System Dokumentation](./PLUGIN_SYSTEM.md)
- [API-Endpunkt Dokumentation](./API_ENDPOINTS.md)
- [Chat-Integration Guide](./CHAT_INTEGRATION.md) 