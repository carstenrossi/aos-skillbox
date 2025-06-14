# 🎨 Plugin Templates - Quick Start

## 📋 Übersicht

Fertige **Copy-Paste Templates** für häufig benötigte LORA-Plugins. Alle Templates basieren auf dem erfolgreichen **Pixar Plugin** und sind sofort einsatzbereit.

## 🚀 Quick Start

### **1. Template wählen**
```bash
# Verfügbare Templates:
├── 🎌 Anime Style Plugin
├── 📸 Realistic Portrait Plugin  
├── 🌄 Landscape Photography Plugin
├── 🎨 Oil Painting Plugin
└── 🦸 Superhero Plugin
```

### **2. LORA URL finden**
```bash
# Beste LORA-Quellen:
- Hugging Face: https://huggingface.co/models?search=flux+lora
- CivitAI: https://civitai.com/search/models?query=flux
- XLabs Collection: https://huggingface.co/collections/XLabs-AI/flux-loras-654aa002d21b6468b5c4b4d7
```

### **3. Template anpassen**
```json
// 1. IDs und Namen ändern
"id": "flux_[YOUR_STYLE]_generator",
"name": "flux_[YOUR_STYLE]_generator",

// 2. LORA URL einfügen  
"url": "https://huggingface.co/USER/MODEL/resolve/main/FILE.safetensors",

// 3. Trigger-Words anpassen
"prompt": "[YOUR_STYLE] style ${parameters.prompt}"
```

### **4. Pattern Recognition erweitern**
```javascript
// In functionCallDetector.ts hinzufügen:
/(?:erstelle|generiere|erzeuge|mache)\s+(?:ein|eine)?\s*(?:YOUR_KEYWORDS)\s*(?:bild|stil|style)\s+(?:von|über|mit)?\s*(.+)/i,
```

### **5. Plugin installieren**
```bash
# 1. JSON in Admin Panel importieren
# 2. fal.ai API Key konfigurieren  
# 3. Mit Test-Prompt testen
```

## ⚡ Template-spezifische Einstellungen

| Template | Inference Steps | Guidance Scale | LORA Weight | Optimal Size |
|----------|----------------|----------------|-------------|--------------|
| **Anime** | 30 | 4.0 | 1.1 | portrait_4_3 |
| **Realistic** | 35 | 3.8 | 0.9 | portrait_4_3 |
| **Landscape** | 32 | 3.2 | 1.0 | landscape_16_9 |
| **Oil Painting** | 28 | 3.5 | 1.2 | square_hd |
| **Superhero** | 30 | 3.8 | 1.0 | portrait_4_3 |

## 🎯 Empfohlene Test-Prompts

### **Anime Plugin**
```
"Erstelle ein Anime Bild von einem tapferen Krieger"
"Im Anime Stil: Ein süßes Mädchen mit großen Augen"
"Generate an anime character with blue hair"
```

### **Realistic Plugin**  
```
"Erstelle ein realistisches Portrait von einem älteren Mann"
"Professionelles Foto einer Geschäftsfrau"
"Generate a realistic headshot of a young woman"
```

### **Landscape Plugin**
```
"Erstelle eine Landschaft von einem Bergsee bei Sonnenuntergang"
"Naturaufnahme eines nebligen Waldes"
"Generate a cinematic landscape of mountains"
```

## 📚 Vollständige Dokumentation

Für detaillierte Informationen und erweiterte Templates siehe:
👉 **[LORA Plugin Development Guide](./LORA_PLUGIN_DEVELOPMENT_GUIDE.md)**

## 💡 Tipps

### **LORA Weight Fine-tuning**
```javascript
// Zu schwach (< 0.7): Style kaum sichtbar
// Optimal (0.8-1.2): Balancierter Style  
// Zu stark (> 1.5): Übertriebener Style, Artifacts
```

### **Performance Optimierung**
```javascript
// Schnell: 20 steps, 3.0 guidance (~15s)
// Balanced: 28 steps, 3.5 guidance (~25s)  
// Quality: 35 steps, 4.0 guidance (~40s)
```

### **Multi-LORA Kombinationen**
```javascript
loras: [
  { name: "style", url: "...", weight: 1.0 },      // Hauptstil
  { name: "lighting", url: "...", weight: 0.6 },  // Beleuchtung
  { name: "detail", url: "...", weight: 0.4 }     // Details
]
```

---

**🎨 Bereit für unbegrenzte Kreativität mit LORA-Plugins!** 🚀 