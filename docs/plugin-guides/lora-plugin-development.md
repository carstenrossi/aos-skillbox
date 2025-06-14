# 🎨 LORA Plugin Development Guide
## Anleitung zur Erstellung von LORA-basierten Plugins für Skillbox

### 📋 Übersicht

Dieses Dokument beschreibt, wie Sie **weitere LORA-basierte Plugins** für das Skillbox System erstellen können. Das **Pixar Plugin** dient als erfolgreiches Template und Referenz.

## 🏗️ LORA Plugin Architektur

### **Template-basierte Entwicklung**
Alle LORA-Plugins folgen dem gleichen bewährten Muster:
1. **fal.ai FLUX.1 [dev]** als Basis-Modell
2. **Externe LORA** von Hugging Face oder anderen Quellen
3. **Spezialisierte Pattern Recognition** für Style-spezifische Anfragen
4. **Optimierte Parameter** für den jeweiligen Stil

### **Unterstützte LORA-Quellen**
- ✅ **Hugging Face**: `https://huggingface.co/user/model/resolve/main/file.safetensors`
- ✅ **CivitAI**: Direkte Modell-URLs
- ✅ **Eigene Hosting**: Jede öffentlich zugängliche SAFETENSORS-Datei

## 🚀 Plugin-Erstellung Workflow

### **Schritt 1: LORA recherchieren**

**Beliebte LORA-Kategorien:**
```bash
🎭 Style-LORAs:
├── Anime/Manga Style
├── Realistic Photography
├── Oil Painting
├── Watercolor
├── Cyberpunk
└── Vintage/Retro

👥 Character-LORAs:
├── Disney Characters
├── Marvel/DC Heroes
├── Game Characters
└── Celebrities

🌍 Scene-LORAs:
├── Landscapes
├── Architecture
├── Sci-Fi Environments
└── Fantasy Worlds
```

**LORA-Quellen:**
- [Hugging Face Models](https://huggingface.co/models?pipeline_tag=text-to-image)
- [CivitAI Community](https://civitai.com/)
- [LoRA Hub](https://lora-hub.com/)

### **Schritt 2: Plugin JSON Template verwenden**

Basierend auf dem **Pixar Plugin Template**:

```json
{
  "id": "flux_[STYLE]_generator",
  "name": "flux_[STYLE]_generator", 
  "display_name": "Flux [STYLE] Generator",
  "description": "Generate [STYLE] images using FLUX.1 [dev] model with [STYLE] LORA via fal.ai",
  "version": "1.0.0",
  "author": "Skillbox",
  "plugin_type": "image_generation",
  "runtime_type": "nodejs",
  "manifest": {
    // ... Siehe vollständiges Template unten
  }
}
```

### **Schritt 3: Pattern Recognition konfigurieren**

Erweitern Sie `functionCallDetector.ts` mit style-spezifischen Patterns:

```javascript
// Beispiel für Anime Plugin
const animePatterns = [
  /(?:erstelle|generiere|erzeuge|mache)\s+(?:ein|eine)?\s*(?:anime|manga|japanisch)\s*(?:bild|stil|style|character|charakter)\s+(?:von|über|mit)?\s*(.+)/i,
  /(?:im\s+)?(?:anime|manga|japanisch)\s*(?:stil|style)\s*[:,-]?\s*(.+)/i,
  /(?:generate|create|make)\s+(?:an?\s+)?(?:anime|manga|japanese)\s*(?:style\s+)?(?:image|character)\s+(?:of\s+)?(.+)/i
];
```

## 📝 Plugin Templates

### **1. Anime Style Plugin**

<details>
<summary>🎌 <strong>Anime Style Generator Template</strong></summary>

```json
{
  "id": "flux_anime_generator",
  "name": "flux_anime_generator",
  "display_name": "Flux Anime Style Generator", 
  "description": "Generate anime-style images using FLUX.1 [dev] model with anime LORA via fal.ai",
  "version": "1.0.0",
  "author": "Skillbox",
  "plugin_type": "image_generation",
  "runtime_type": "nodejs",
  "manifest": {
    "name": "flux_anime_generator",
    "display_name": "Flux Anime Style Generator",
    "functions": [
      {
        "name": "generate_anime_image",
        "description": "Generate anime-style images from text descriptions. Use for anime, manga, or Japanese animation style requests.",
        "parameters": {
          "prompt": {
            "type": "string", 
            "description": "The prompt to generate an anime-style image from. The 'anime' trigger word will be automatically added.",
            "required": true
          },
          "image_size": {
            "type": "enum",
            "values": ["square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"],
            "default": "portrait_4_3"
          },
          "lora_weight": {
            "type": "number",
            "description": "Weight of the Anime LORA (0.0 to 2.0)", 
            "default": 1.1,
            "min": 0.0,
            "max": 2.0
          }
        }
      }
    ],
    "code": "async function generate_anime_image(parameters) {\n  try {\n    console.log('🎌 Anime: Starting anime-style image generation with prompt:', parameters.prompt);\n    \n    if (!fal || typeof fal.run !== 'function') {\n      throw new Error('fal.ai client not available or fal.run method not found.');\n    }\n    \n    // Add anime trigger word automatically\n    let enhancedPrompt = parameters.prompt;\n    if (!enhancedPrompt.toLowerCase().includes('anime')) {\n      enhancedPrompt = `anime style ${enhancedPrompt}`;\n    }\n    \n    const requestData = {\n      prompt: enhancedPrompt,\n      image_size: parameters.image_size || 'portrait_4_3',\n      num_inference_steps: 30,\n      guidance_scale: 4.0,\n      enable_safety_checker: true,\n      loras: [\n        {\n          name: \"anime-lora\",\n          url: \"https://huggingface.co/USERNAME/anime-lora/resolve/main/anime_style.safetensors\",\n          weight: parameters.lora_weight || 1.1\n        }\n      ]\n    };\n    \n    const result = await fal.run('fal-ai/flux/dev', {\n      input: requestData\n    });\n    \n    // ... Response handling (same as Pixar plugin)\n    \n  } catch (error) {\n    // ... Error handling\n  }\n}"
  },
  "config_schema": {
    "api_key": {
      "type": "string",
      "description": "fal.ai API Key",
      "required": true,
      "secret": true
    },
    "default_lora_weight": {
      "type": "number", 
      "description": "Default LORA weight for anime style",
      "default": 1.1,
      "min": 0.0,
      "max": 2.0
    }
  }
}
```
</details>

### **2. Realistic Portrait Plugin**

<details>
<summary>📸 <strong>Realistic Portrait Generator Template</strong></summary>

```json
{
  "id": "flux_realistic_generator",
  "name": "flux_realistic_generator", 
  "display_name": "Flux Realistic Portrait Generator",
  "description": "Generate photorealistic portraits using FLUX.1 [dev] model with realistic LORA via fal.ai",
  "version": "1.0.0",
  "author": "Skillbox",
  "plugin_type": "image_generation",
  "runtime_type": "nodejs",
  "manifest": {
    "name": "flux_realistic_generator",
    "display_name": "Flux Realistic Portrait Generator",
    "functions": [
      {
        "name": "generate_realistic_image",
        "description": "Generate photorealistic portrait images. Use for realistic, photographic, or professional portrait requests.",
        "parameters": {
          "prompt": {
            "type": "string",
            "description": "The prompt for realistic portrait generation.",
            "required": true
          },
          "lighting_style": {
            "type": "enum",
            "description": "Professional lighting setup",
            "values": ["studio", "natural", "dramatic", "soft", "golden_hour"],
            "default": "studio"
          },
          "portrait_type": {
            "type": "enum", 
            "description": "Type of portrait shot",
            "values": ["headshot", "half_body", "full_body", "close_up"],
            "default": "headshot"
          }
        }
      }
    ],
    "code": "async function generate_realistic_image(parameters) {\n  try {\n    console.log('📸 Realistic: Starting realistic portrait generation');\n    \n    const enhancedPrompt = `professional ${parameters.portrait_type} portrait, ${parameters.lighting_style} lighting, ${parameters.prompt}, high quality, detailed, photorealistic`;\n    \n    const requestData = {\n      prompt: enhancedPrompt,\n      image_size: 'portrait_4_3',\n      num_inference_steps: 35,\n      guidance_scale: 3.8,\n      enable_safety_checker: true,\n      loras: [\n        {\n          name: \"realistic-portrait-lora\",\n          url: \"https://huggingface.co/USERNAME/realistic-lora/resolve/main/realistic_portraits.safetensors\",\n          weight: 0.9\n        }\n      ]\n    };\n    \n    const result = await fal.run('fal-ai/flux/dev', {\n      input: requestData\n    });\n    \n    // ... Response handling\n    \n  } catch (error) {\n    // ... Error handling\n  }\n}"
  }
}
```
</details>

### **3. Landscape Photography Plugin**

<details>
<summary>🌄 <strong>Landscape Generator Template</strong></summary>

```json
{
  "id": "flux_landscape_generator",
  "name": "flux_landscape_generator",
  "display_name": "Flux Landscape Generator",
  "description": "Generate cinematic landscape images using FLUX.1 [dev] model with landscape LORA via fal.ai",
  "version": "1.0.0",
  "author": "Skillbox", 
  "plugin_type": "image_generation",
  "runtime_type": "nodejs",
  "manifest": {
    "name": "flux_landscape_generator",
    "display_name": "Flux Landscape Generator",
    "functions": [
      {
        "name": "generate_landscape_image",
        "description": "Generate cinematic landscape and nature images. Use for landscape, nature, or scenic photography requests.",
        "parameters": {
          "prompt": {
            "type": "string",
            "description": "Description of the landscape scene.",
            "required": true
          },
          "time_of_day": {
            "type": "enum",
            "description": "Time of day for the scene",
            "values": ["sunrise", "golden_hour", "midday", "sunset", "blue_hour", "night"],
            "default": "golden_hour"
          },
          "weather": {
            "type": "enum",
            "description": "Weather conditions",
            "values": ["clear", "cloudy", "stormy", "foggy", "rainy", "snowy"],
            "default": "clear"
          }
        }
      }
    ],
    "code": "async function generate_landscape_image(parameters) {\n  try {\n    console.log('🌄 Landscape: Starting landscape generation');\n    \n    const enhancedPrompt = `cinematic landscape photography, ${parameters.prompt}, ${parameters.time_of_day} lighting, ${parameters.weather} weather, professional photography, high resolution, detailed`;\n    \n    const requestData = {\n      prompt: enhancedPrompt,\n      image_size: 'landscape_16_9',\n      num_inference_steps: 32,\n      guidance_scale: 3.2,\n      enable_safety_checker: true,\n      loras: [\n        {\n          name: \"landscape-lora\",\n          url: \"https://huggingface.co/USERNAME/landscape-lora/resolve/main/cinematic_landscapes.safetensors\",\n          weight: 1.0\n        }\n      ]\n    };\n    \n    const result = await fal.run('fal-ai/flux/dev', {\n      input: requestData\n    });\n    \n    // ... Response handling\n    \n  } catch (error) {\n    // ... Error handling  \n  }\n}"
  }
}
```
</details>

## 🔧 Function Call Detector erweitern

### **Pattern-Integration für neue Styles**

Erweitern Sie `functionCallDetector.ts`:

```javascript
// In naturalLanguagePatterns array hinzufügen:

// Anime patterns
/(?:erstelle|generiere|erzeuge|mache)\s+(?:ein|eine)?\s*(?:anime|manga|japanisch)\s*(?:bild|stil|style|character|charakter)\s+(?:von|über|mit)?\s*(.+)/i,
/(?:im\s+)?(?:anime|manga|japanisch)\s*(?:stil|style)\s*[:,-]?\s*(.+)/i,

// Realistic patterns  
/(?:erstelle|generiere|erzeuge|mache)\s+(?:ein|eine)?\s*(?:realistisch|fotorealistisch|professionell)\s*(?:portrait|foto|bild)\s+(?:von|über|mit)?\s*(.+)/i,
/(?:professionell|realistisch|fotorealistisch)\s*(?:portrait|foto)\s*[:,-]?\s*(.+)/i,

// Landscape patterns
/(?:erstelle|generiere|erzeuge|mache)\s+(?:ein|eine)?\s*(?:landschaft|natur|berg|see|wald)\s*(?:foto|bild)\s+(?:von|über|mit)?\s*(.+)/i,
/(?:landschafts|natur)(?:fotografie|bild)\s*[:,-]?\s*(.+)/i
```

### **Plugin-spezifische Erkennung**

In `detectImageGenerationRequests` erweitern:

```javascript
// Check for style-specific patterns
const stylePatterns = {
  anime: this.naturalLanguagePatterns.slice(12, 14),    // Anime patterns
  realistic: this.naturalLanguagePatterns.slice(14, 16), // Realistic patterns  
  landscape: this.naturalLanguagePatterns.slice(16, 18)  // Landscape patterns
};

for (const [style, patterns] of Object.entries(stylePatterns)) {
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const stylePlugin = imagePlugins.find(p => 
        p.name.includes(style) || p.display_name.toLowerCase().includes(style)
      );
      
      if (stylePlugin) {
        // ... Plugin execution logic
      }
    }
  }
}
```

## ⚙️ Multi-LORA Support

### **Mehrere LORAs gleichzeitig verwenden**

```javascript
const requestData = {
  prompt: enhancedPrompt,
  // ... andere Parameter
  loras: [
    {
      name: "style-lora",
      url: "https://huggingface.co/user/style-lora/resolve/main/style.safetensors", 
      weight: 1.0
    },
    {
      name: "character-lora", 
      url: "https://huggingface.co/user/character-lora/resolve/main/character.safetensors",
      weight: 0.8
    },
    {
      name: "lighting-lora",
      url: "https://huggingface.co/user/lighting-lora/resolve/main/lighting.safetensors", 
      weight: 0.6
    }
  ]
};
```

### **LORA Weight Optimization**

```javascript
// Optimal LORA weight ranges:
const weightRanges = {
  style: { min: 0.8, max: 1.3, optimal: 1.0 },      // Main style
  character: { min: 0.5, max: 1.0, optimal: 0.8 },  // Character features
  lighting: { min: 0.3, max: 0.8, optimal: 0.5 },   // Lighting effects
  detail: { min: 0.2, max: 0.6, optimal: 0.4 }      // Detail enhancement
};
```

## 📊 Performance Guidelines

### **Optimierte Parameter pro Style**

| Style | Inference Steps | Guidance Scale | Optimal Size |
|-------|----------------|----------------|--------------|
| **Pixar/Cartoon** | 28 | 3.5 | landscape_4_3 |
| **Anime/Manga** | 30 | 4.0 | portrait_4_3 |
| **Realistic Portrait** | 35 | 3.8 | portrait_4_3 |
| **Landscape** | 32 | 3.2 | landscape_16_9 |
| **Architecture** | 40 | 3.0 | landscape_4_3 |

### **Cost Optimization**

```javascript
// Cost-Performance Balance
const configs = {
  fast: { steps: 20, guidance: 3.0 },      // ~$0.06, 15s
  balanced: { steps: 28, guidance: 3.5 },  // ~$0.08, 25s  
  quality: { steps: 40, guidance: 4.0 }    // ~$0.12, 40s
};
```

## 🚀 Deployment Workflow

### **1. Plugin Development**
```bash
# 1. Copy Pixar plugin template
cp backend/plugins/flux_pixar_generator.json backend/plugins/flux_[STYLE]_generator.json

# 2. Customize for your style
# - Update IDs, names, descriptions
# - Configure LORA URL and weights
# - Adjust parameters for style

# 3. Add pattern recognition
# - Extend functionCallDetector.ts
# - Add style-specific patterns
```

### **2. Testing Workflow**
```bash
# 1. Install plugin via Admin Panel
# 2. Configure API key
# 3. Test with sample prompts:

"Erstelle ein [STYLE] Bild von einem [SUBJECT]"
"Im [STYLE] Stil: [DESCRIPTION]" 
"Generate a [STYLE] image of [SUBJECT]"
```

### **3. Quality Assurance**
```bash
# Performance Tests:
- Speed: < 45 seconds per image
- Quality: Consistent style application  
- Error Rate: < 5% API failures
- Cost: Within budget constraints

# Pattern Tests:
- German pattern recognition
- English pattern recognition  
- Style-specific trigger words
- Fallback to general image plugin
```

## 📚 LORA Resources

### **Hugging Face Collections**
- [Flux LORA Collection](https://huggingface.co/collections/XLabs-AI/flux-loras-654aa002d21b6468b5c4b4d7)
- [Style Transfer Models](https://huggingface.co/models?search=style+transfer)
- [Character LORAs](https://huggingface.co/models?search=character+lora)

### **Community Resources**
- [CivitAI FLUX Models](https://civitai.com/search/models?query=flux)
- [Reddit r/StableDiffusion](https://reddit.com/r/StableDiffusion)
- [Discord Communities](https://discord.gg/stablediffusion)

### **LORA Training Resources**
- [Kohya SS Training](https://github.com/kohya-ss/sd-scripts)
- [LoRA Training Guide](https://rentry.org/lora_train)
- [Dataset Preparation](https://rentry.org/LazyTrainGuide)

## 🔍 Troubleshooting

### **Häufige Probleme**

**1. LORA lädt nicht**
```bash
# Check LORA URL accessibility
curl -I "https://huggingface.co/user/model/resolve/main/file.safetensors"

# Verify LORA format
file downloaded_lora.safetensors
```

**2. Style wird nicht angewendet**
```bash
# Increase LORA weight
"lora_weight": 1.2  // instead of 1.0

# Add stronger trigger words
"prompt": "strong anime style, very detailed anime character, ..."
```

**3. Pattern Recognition fehlt**
```bash
# Check logs for pattern matches
tail -f backend/backend.log | grep "Matched.*pattern"

# Test explicit function calls
FUNCTION_CALL: flux_anime_generator.generate_anime_image(prompt="test")
```

## ✅ Checklist für neue LORA Plugins

- [ ] **LORA URL getestet und zugänglich**
- [ ] **Plugin JSON vollständig konfiguriert**
- [ ] **Pattern Recognition implementiert**
- [ ] **Function Call Detector erweitert**
- [ ] **Optimale Parameter getestet**
- [ ] **API Key konfiguriert**
- [ ] **Mehrere Test-Prompts erfolgreich**
- [ ] **Performance-Metriken gemessen**
- [ ] **Dokumentation aktualisiert**

---

## 🎯 Nächste Schritte

Mit diesem Guide können Sie beliebig viele **spezialisierte LORA-Plugins** erstellen:

1. 🎌 **Anime Style Plugin**
2. 📸 **Realistic Portrait Plugin** 
3. 🌄 **Landscape Photography Plugin**
4. 🎨 **Oil Painting Plugin**
5. 🏗️ **Architecture Plugin**
6. 🦸 **Superhero Plugin**
7. 🔮 **Fantasy Art Plugin**

**Das Plugin-System ist jetzt bereit für unbegrenzte Kreativität!** 🚀 