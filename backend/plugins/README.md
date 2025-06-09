# Skillbox Plugin System - Dokumentation

## Plugin Erstellung

### Übersicht

Das Skillbox Plugin System ermöglicht es, externe APIs und Services als Funktionen in die Chat-Assistenten zu integrieren. Plugins werden als JSON-Dateien definiert und können über das Admin-Panel importiert werden.

### Plugin-Struktur

Ein Plugin besteht aus folgenden Hauptkomponenten:

```json
{
  "id": "eindeutige_plugin_id",
  "name": "plugin_name",
  "display_name": "Anzeigename im UI",
  "description": "Was das Plugin macht",
  "version": "1.0.0",
  "author": "Dein Name",
  "plugin_type": "Kategorie (image_generation, audio, text, etc.)",
  "runtime_type": "nodejs",
  "manifest": {
    "name": "plugin_name",
    "display_name": "Anzeigename",
    "version": "1.0.0", 
    "description": "Beschreibung",
    "author": "Autor",
    "runtime": "nodejs",
    "functions": [
      {
        "name": "function_name",
        "description": "Was die Funktion macht und wann sie verwendet werden soll",
        "parameters": {
          "param1": {
            "type": "string|number|enum|boolean",
            "description": "Parameter Beschreibung",
            "required": true|false,
            "default": "Standardwert",
            "min": 1,
            "max": 100,
            "values": ["option1", "option2"] // nur bei enum
          }
        }
      }
    ],
    "code": "// JavaScript Code hier"
  },
  "config_schema": {
    "api_key": {
      "type": "string",
      "description": "API Schlüssel",
      "required": true,
      "secret": true
    }
  },
  "dependencies": ["npm-package-name"],
  "is_active": true,
  "is_public": true
}
```

### Plugin-Typen

- **image_generation**: Bildgenerierung (z.B. DALL-E, Midjourney)
- **audio**: Audio-Verarbeitung (z.B. Text-to-Speech, Speech-to-Text)
- **text**: Text-Verarbeitung (z.B. Übersetzung, Zusammenfassung)
- **data**: Datenverarbeitung (z.B. Excel, CSV)
- **utility**: Hilfsfunktionen (z.B. QR-Code, URL Shortener)

### Parameter-Typen

- **string**: Text-Eingabe
- **number**: Zahlen
- **boolean**: true/false
- **enum**: Auswahl aus vordefinierten Werten

### Code-Anforderungen

Der Plugin-Code muss:
1. **Async/Await** verwenden für API-Calls
2. **Fehlerbehandlung** mit try/catch implementieren
3. **Standardisierte Rückgabe** verwenden:

```javascript
// Erfolg
return {
  success: true,
  data: {
    // Hauptdaten (z.B. image_url, audio_url, text)
  },
  message: "Erfolgsmeldung"
};

// Fehler
return {
  success: false,
  error: "Fehlermeldung",
  data: null,
  message: "Fehlermeldung für User"
};
```

### Verfügbare Globale Objekte

Im Plugin-Code sind folgende Objekte verfügbar:
- `fal`: fal.ai Client (wenn konfiguriert)
- `console`: Für Logging
- Standard JavaScript APIs (fetch, etc.)

### Plugin-Import

1. JSON-Datei über Admin-Panel → Plugins → "Import Plugin" hochladen
2. API-Keys in der Plugin-Konfiguration setzen
3. Plugin aktivieren
4. Plugin einem Assistenten zuweisen

### Debugging

Verwende `console.log()` für Debug-Ausgaben. Diese erscheinen in den Backend-Logs und im Plugin-Execution-Log im Admin-Panel.

### Best Practices

1. **Eindeutige IDs**: Verwende beschreibende, eindeutige Plugin-IDs
2. **Versionierung**: Erhöhe die Version bei Änderungen
3. **Fehlerbehandlung**: Fange alle möglichen Fehler ab
4. **Parameter-Validierung**: Prüfe Eingabeparameter
5. **Timeout-Handling**: Setze Timeouts für API-Calls
6. **Logging**: Logge wichtige Schritte für Debugging

### Beispiel: Einfaches Plugin

Siehe `plugin_template.json` für ein vollständiges Beispiel-Template.

### Support

Bei Problemen:
1. Prüfe Backend-Logs für Fehlermeldungen
2. Schaue ins Plugin-Execution-Log im Admin-Panel
3. Teste API-Calls separat außerhalb des Plugins 

## 🎯 Wichtige Erkenntnisse & Best Practices

### **1. Plugin Response Structure & Backend Integration**

**Problem:** Das Backend muss verschiedene Response-Strukturen unterstützen.

**Lösung:** Verwende flexible Response-Handling:

```javascript
// Für Medien-URLs (Bilder, Audio, Video)
return {
  success: true,
  data: {
    image_url: "https://...",     // Direkt in data
    audio_url: "data:audio/...",  // Direkt in data 
    video_url: "https://...",     // Direkt in data
    // ODER verschachtelt:
    data: {
      image_url: "https://..."    // Für APIs wie fal.ai
    }
  }
};
```

**Backend unterstützt automatisch beide Strukturen:**
- `pluginExecResult.data.image_url` 
- `pluginExecResult.data.data.image_url`

### **2. Node.js Sandbox Environment**

**Verfügbare Objekte in der Plugin-Sandbox:**

```javascript
// ✅ Verfügbar:
console.log("Debug info");
parameters.text        // Übergebene Parameter
config.api_key        // Plugin-Konfiguration
fetch                 // (await import('node-fetch')).default
setTimeout/setInterval
Buffer                // Node.js Buffer (null in Sandbox)

// ❌ NICHT verfügbar:
require()             // Sicherheit
process               // Sicherheit  
global                // Sicherheit
fs                    // Dateisystem-Zugriff
```

**Wichtig:** `fetch` ist NICHT das native Web-API `fetch`, sondern `node-fetch` v3!

### **3. API Integration Best Practices**

```javascript
async function your_function(parameters) {
  try {
    // 1. Parameter-Validierung
    if (!parameters.required_param) {
      throw new Error('Parameter required_param ist erforderlich');
    }

    // 2. API-Konfiguration prüfen
    if (!config.api_key) {
      throw new Error('API Key nicht konfiguriert');
    }

    // 3. API-Request mit korrektem fetch
    const response = await fetch('https://api.example.com/endpoint', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: parameters.text
      })
    });

    // 4. Response-Validierung
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    // 5. Daten verarbeiten (für node-fetch v3)
    const audioBuffer = await response.buffer(); // NICHT .arrayBuffer()!
    const base64Audio = audioBuffer.toString('base64');
    
    // 6. Strukturiertes Response
    return {
      success: true,
      data: {
        audio_url: `data:audio/mpeg;base64,${base64Audio}`,
        metadata: {
          size: audioBuffer.length,  // NICHT .byteLength!
          format: 'mp3'
        }
      },
      message: `Audio erfolgreich generiert`
    };

  } catch (error) {
    // 7. Strukturiertes Error Handling  
    console.error('❌ Plugin Error:', error);
    return {
      success: false,
      error: error.message,
      data: null,
      message: `Fehler: ${error.message}`
    };
  }
}
```

### **4. Frontend Media-Support**

**Das System erkennt automatisch:**

```javascript
// Bilder
![Generated Image](https://example.com/image.jpg)
// Wird zu: <ImageGallery />

// Audio  
[Audio anhören](data:audio/mpeg;base64,...)
// Wird zu: <AudioPlayer />

// Videos (zukünftig)
[Video ansehen](https://example.com/video.mp4)
// Wird zu: <VideoPlayer />
```

**Plugin muss zurückgeben:**
- `image_url` → Backend erstellt `![Generated Image](URL)`
- `audio_url` → Backend erstellt `[Audio anhören](URL)`  
- `video_url` → Backend erstellt `[Video ansehen](URL)`

### **5. System-Prompt Integration**

**Das System-Prompt wird automatisch generiert:**

```
**plugin_name.function_name**: Beschreibung der Funktion

FUNCTION_CALL: plugin_name.function_name(param1="wert1", param2="wert2")
```

**Wichtig:** Parameter-Namen im System-Prompt müssen mit Plugin-Schema übereinstimmen!

### **6. Plugin Development Workflow**

1. **Entwicklung:** Plugin lokal erstellen und testen
2. **Import:** Plugin über Admin-Panel importieren
3. **Konfiguration:** API Keys und Einstellungen setzen
4. **Zuweisung:** Plugin einem Assistenten zuweisen
5. **Test:** Funktionalität im Chat testen

**Bei Änderungen:**
- **Code-Änderungen:** Plugin neu importieren erforderlich
- **Backend-Logik:** Automatischer Restart via nodemon
- **Frontend:** Automatischer Reload

### **7. Debugging & Logging**

```javascript
// Strukturiertes Logging
console.log('🔧 Plugin: Starting operation...');
console.log('📝 Plugin: Request data:', JSON.stringify(data, null, 2));
console.log('✅ Plugin: Operation completed');
console.error('❌ Plugin: Error occurred:', error);

// Debug Plugin Response
console.log('🔍 Plugin: Response structure:', Object.keys(result || {}));
```

### **8. Häufige Fallstricke**

| Problem | Ursache | Lösung |
|---------|---------|---------|
| `fetch is not a function` | Native fetch verwendet | Verwende bereitgestelltes fetch |
| `config is not defined` | Alte Plugin-Version | Plugin neu importieren |
| `Buffer.byteLength` Error | Web-API Buffer verwendet | Verwende `buffer.length` |
| Medien werden nicht angezeigt | Falsche URL-Struktur | Prüfe Backend Response-Handling |
| Plugin-Änderungen ignoriert | Cache | Plugin neu importieren |

### **9. Plugin-Typen Guidelines**

| Plugin-Typ | Empfohlene `plugin_type` | Response Format |
|------------|-------------------------|-----------------|
| Bildgenerierung | `image_generation` | `{ image_url: "..." }` |
| Audio/TTS | `audio` | `{ audio_url: "data:audio/..." }` |
| Video | `video` | `{ video_url: "..." }` |
| Text/Utility | `text` / `utility` | `{ text: "...", result: "..." }` |
| Data/API | `data` | `{ data: {...}, result: "..." }` |

## Parameter-Typen

// ... existing code ... 