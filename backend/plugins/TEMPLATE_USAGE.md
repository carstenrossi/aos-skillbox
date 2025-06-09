# Plugin Template Verwendung

## Schnellstart

1. **Template kopieren**: `cp plugin_template.json mein_plugin.json`
2. **Anpassen**: Ersetze alle `your_plugin_*` Werte mit deinen eigenen
3. **Code schreiben**: Implementiere deine Funktion im `code` Feld
4. **Importieren**: Über Admin Panel → Plugins → Import Plugin
5. **Konfigurieren**: API Keys und Einstellungen setzen
6. **Zuweisen**: Plugin einem Assistenten zuweisen

## Beispiel: ElevenLabs Plugin

Das `elevenlabs_tts.json` Plugin zeigt eine vollständige Implementierung:

- **API Integration**: Mit fetch() und Error Handling
- **Parameter Validierung**: Eingaben prüfen und Grenzen setzen  
- **Response Processing**: Audio-Daten zu Base64 konvertieren
- **Error Handling**: Ausführliche Fehlerbehandlung
- **Metadata**: Zusätzliche Informationen für den User

## Häufige Anpassungen

### 1. Plugin IDs und Namen ändern
```json
{
  "id": "mein_api_plugin",
  "name": "mein_api_plugin", 
  "display_name": "Mein API Plugin"
}
```

### 2. Plugin-Typ festlegen
```json
{
  "plugin_type": "audio|image_generation|text|data|utility"
}
```

### 3. API Konfiguration
```json
{
  "config_schema": {
    "api_key": {
      "type": "string",
      "required": true,
      "secret": true,
      "description": "Dein API Schlüssel"
    }
  }
}
```

### 4. Funktions-Parameter
```json
{
  "parameters": {
    "text": {
      "type": "string",
      "required": true,
      "description": "Text Eingabe"
    },
    "options": {
      "type": "enum", 
      "values": ["option1", "option2"],
      "default": "option1"
    }
  }
}
```

### 5. Rückgabe-Formate

#### Für Bilder:
```javascript
return {
  success: true,
  data: {
    image_url: "https://...",
    metadata: { width: 1024, height: 768 }
  }
};
```

#### Für Audio:
```javascript
return {
  success: true,
  data: {
    audio_url: "data:audio/mpeg;base64,..." // oder HTTP URL
  }
};
```

#### Für Text:
```javascript
return {
  success: true,
  data: {
    text: "Bearbeiteter Text"
  }
};
```

#### Für Dateien:
```javascript
return {
  success: true,
  data: {
    file_url: "https://...",
    file_type: "pdf|xlsx|csv"
  }
};
```

## Frontend Integration

Das System erkennt automatisch:

- **Bilder**: `![alt](url)` → ImageGallery
- **Audio**: `[Audio anhören](url)` → AudioPlayer  
- **Links**: `[Text](url)` → Clickable Links
- **Text**: Normal als Markdown gerendert

## Debugging

1. **Console Logs**: Verwende `console.log()` im Plugin Code
2. **Admin Panel**: Plugin Execution Logs ansehen
3. **Backend Logs**: Terminal Output prüfen
4. **Browser DevTools**: Network Tab für API Calls

## Dependencies

Falls externe NPM Packages benötigt werden:

```json
{
  "dependencies": ["axios", "@package/name"]
}
```

Hinweis: Packages müssen im Backend installiert werden.

## Testing

1. **Plugin Import**: Testen über Admin Panel
2. **Parameter Tests**: Verschiedene Eingaben ausprobieren  
3. **Error Cases**: Falsche API Keys, ungültige Parameter
4. **Performance**: Große Eingaben und Timeouts testen

Siehe `elevenlabs_tts.json` für ein vollständiges Arbeitsbeispiel!

## 📖 Erweiterte Dokumentation

**Für komplexe Plugin-Entwicklung lies bitte:**
- **`README.md`** - Vollständige Plugin-Dokumentation
- **Sektion "Wichtige Erkenntnisse & Best Practices"** - Erfahrungen aus realen Plugin-Implementierungen

## 🛠️ Troubleshooting

### **Plugin wird nicht ausgeführt**
1. **Logs prüfen**: Backend-Logs für Fehler durchsuchen
2. **Parameter prüfen**: System-Prompt vs. Plugin-Schema vergleichen
3. **Plugin neu importieren**: Bei Code-Änderungen erforderlich

### **fetch is not a function**
```javascript
// ❌ Falsch:
const response = await fetch(url);

// ✅ Richtig: 
// fetch ist bereits verfügbar in der Sandbox
const response = await fetch(url);
```

### **config is not defined**
- Plugin neu importieren (nicht nur Code ändern)
- Backend-Restart kann helfen

### **Medien werden nicht angezeigt**
```javascript
// ✅ Richtige Response-Struktur:
return {
  success: true,
  data: {
    image_url: "https://...",    // Für Bilder
    audio_url: "data:audio/...", // Für Audio
    video_url: "https://..."     // Für Videos
  }
};
```

### **Buffer/Array-Probleme**
```javascript
// ❌ Web-API (funktioniert nicht):
const buffer = await response.arrayBuffer();
const size = buffer.byteLength;

// ✅ Node.js (funktioniert):
const buffer = await response.buffer();
const size = buffer.length;
```

## 💡 Pro-Tipps

1. **Strukturiertes Logging**: Verwende Emojis für bessere Log-Lesbarkeit
2. **Error-first**: Implementiere Error-Handling vor der Hauptlogik  
3. **Testen**: Teste API-Calls außerhalb des Plugins zuerst
4. **Dokumentieren**: Schreibe ausführliche Funktions-Beschreibungen 