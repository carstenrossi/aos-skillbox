# 🎬 Pixar Plugin Installation Guide

## 📋 Übersicht

Das **Flux Pixar Style Generator Plugin** erweitert Skillbox um die Fähigkeit, hochqualitative Pixar-Style Bilder zu generieren. Es nutzt das FLUX.1 [dev] Modell von fal.ai mit einem speziellen LORA für Pixar-Stilistik.

## 🚀 Installation

### **Schritt 1: Admin Panel öffnen**
1. Gehen Sie zu Ihrem Skillbox Admin Panel: `http://localhost:3000/admin`
2. Navigieren Sie zum **"Plugins"** Tab
3. Klicken Sie **"Neues Plugin erstellen"**

### **Schritt 2: JSON Import**
1. Klicken Sie **"JSON Import"** Button
2. Kopieren Sie den Inhalt aus `backend/plugins/flux_pixar_generator.json`
3. Fügen Sie das JSON in das Textfeld ein
4. Klicken Sie **"JSON importieren"**
5. Alle Formularfelder werden automatisch ausgefüllt

### **Schritt 3: Plugin erstellen**
1. Überprüfen Sie die automatisch ausgefüllten Felder
2. Klicken Sie **"Plugin erstellen"**
3. Das Plugin wird in der Datenbank gespeichert

### **Schritt 4: Plugin konfigurieren**
1. Navigieren Sie zum erstellten Plugin
2. Klicken Sie **"Konfigurieren"**
3. Geben Sie Ihren **fal.ai API Key** ein
4. Passen Sie optional die anderen Parameter an:
   - `default_lora_weight`: 1.0 (empfohlen)
   - `safety_tolerance`: 3 (empfohlen)
   - `output_format`: png (empfohlen)

### **Schritt 5: Plugin zu Assistant zuweisen**
1. Gehen Sie zu **"Assistants"** Tab
2. Wählen Sie den gewünschten Assistant
3. Klicken Sie **"Plugins verwalten"**
4. Aktivieren Sie das **"Flux Pixar Style Generator"** Plugin
5. Speichern Sie die Änderungen

## 🔧 Konfiguration

### **API Key Setup**
Besuchen Sie [fal.ai](https://fal.ai) und erstellen Sie einen Account:
1. Gehen Sie zu Ihrem Dashboard
2. Generieren Sie einen neuen API Key
3. Kopieren Sie den Key (beginnt mit `fal_...`)
4. Fügen Sie ihn in die Plugin-Konfiguration ein

### **Parameter-Übersicht**
```json
{
  "api_key": "fal_xxx...",           // Ihr fal.ai API Key
  "default_lora_weight": 1.0,        // LORA Gewichtung (0.0-2.0)
  "safety_tolerance": 3,             // Sicherheitsfilter (1-5)
  "output_format": "png"            // Ausgabeformat
}
```

## 🎯 Verwendung

### **Automatische Erkennung**
Das Plugin erkennt automatisch Pixar-spezifische Anfragen:

**Deutsche Beispiele:**
- ✅ "Erstelle ein Pixar Bild von einem Roboter"
- ✅ "Im Pixar Stil: Ein kleiner Drache"
- ✅ "Male mir einen Pixar Charakter"
- ✅ "Generiere eine Disney-ähnliche Figur"

**Englische Beispiele:**
- ✅ "Generate a Pixar style image of a robot"
- ✅ "In Pixar style: A small dragon"
- ✅ "Draw me a Pixar character"
- ✅ "Create an animated character"

### **Explizite Aufrufe**
```
FUNCTION_CALL: flux_pixar_generator.generate_pixar_image(prompt="portrait of a superhero")
```

### **Erweiterte Parameter**
```
FUNCTION_CALL: flux_pixar_generator.generate_pixar_image(
  prompt="portrait of a woman", 
  image_size="portrait_4_3",
  lora_weight=1.2,
  num_inference_steps=35
)
```

## 🔍 Funktionsparameter

| Parameter | Typ | Standard | Beschreibung |
|-----------|-----|----------|--------------|
| `prompt` | string | - | Bildbeschreibung (erforderlich) |
| `image_size` | enum | landscape_4_3 | Bildgröße |
| `num_inference_steps` | number | 28 | Inferenz-Schritte (1-50) |
| `guidance_scale` | number | 3.5 | Guidance Scale (1.0-20.0) |
| `lora_weight` | number | 1.0 | LORA Gewichtung (0.0-2.0) |

### **Verfügbare Bildgrößen:**
- `square_hd` - Quadratisch HD
- `square` - Quadratisch Standard  
- `portrait_4_3` - Hochformat 4:3
- `portrait_16_9` - Hochformat 16:9
- `landscape_4_3` - Querformat 4:3
- `landscape_16_9` - Querformat 16:9

## ⚡ Performance & Kosten

### **Geschwindigkeit**
- **FLUX.1 [dev]**: ~20-40 Sekunden pro Bild
- **Höhere Qualität** als schnell-Modell
- **LORA-Processing**: +5-10 Sekunden

### **Kosten** 
Basierend auf [fal.ai Pricing](https://fal.ai/models/fal-ai/flux/dev):
- **$0.025 pro Megapixel** (aufgerundet)
- **Landscape 4:3**: ~$0.08 pro Bild
- **Square HD**: ~$0.10 pro Bild

## 🔍 Troubleshooting

### **Plugin erscheint nicht**
1. Überprüfen Sie die Server-Logs: `backend/backend.log`
2. Stellen Sie sicher, dass das Plugin aktiv ist: `is_active: true`
3. Starten Sie den Server neu: `npm run dev`

### **API Fehler**
1. Überprüfen Sie Ihren fal.ai API Key
2. Prüfen Sie Ihr fal.ai Guthaben
3. Kontrollieren Sie die Request-Parameter

### **Keine Pixar-Erkennung**
1. Verwenden Sie explizite Keywords: "pixar", "cartoon", "disney"
2. Prüfen Sie die Logs auf Pattern-Matches
3. Nutzen Sie explizite Function-Calls als Fallback

## 🎨 Tipps für beste Ergebnisse

### **Prompt-Optimierung**
```bash
# ✅ Gut
"pixar style portrait of a friendly robot with big eyes"

# ✅ Besser  
"pixar style 3D animated character, friendly robot with expressive large eyes, colorful, high quality"

# ⚠️ Vermeiden
"realistic robot photo" (contradicts Pixar style)
```

### **LORA Weight Tuning**
- **0.8-1.0**: Subtiler Pixar-Effekt
- **1.0-1.3**: Standard Pixar-Look (empfohlen)
- **1.3-2.0**: Stark übertriebener Cartoon-Stil

## 📊 Monitoring

### **Plugin-Ausführung verfolgen**
```bash
# Backend Logs
tail -f backend/backend.log | grep "🎬 Pixar"

# Execution Status
curl http://localhost:3001/api/plugins/flux_pixar_generator/executions
```

### **Performance Metrics**
Das System trackt automatisch:
- ⏱️ Ausführungszeit
- 💰 Kosten pro Request  
- ✅ Erfolg/Fehler Rate
- 🔍 Parameter-Nutzung

---

## ✅ Plugin erfolgreich installiert!

Ihr **Flux Pixar Style Generator** ist jetzt einsatzbereit. Testen Sie es mit einer einfachen Anfrage wie:

> "Erstelle ein Pixar Bild von einem süßen Drachen"

🎬 **Viel Spaß beim Erstellen von Pixar-Style Bildern!** 