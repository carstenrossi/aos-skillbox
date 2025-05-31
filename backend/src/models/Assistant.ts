import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export interface Assistant {
  id: string;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  api_url: string;
  jwt_token: string; // Wird verschlüsselt gespeichert
  model_name: string;
  system_prompt: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Persistente Speicherung mit JSON-Datei
class AssistantModel {
  private assistants: Map<string, Assistant> = new Map();
  private dataFile: string;

  constructor() {
    // Stelle sicher, dass data Verzeichnis existiert
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    this.dataFile = path.join(dataDir, 'assistants.json');
    this.loadFromFile();
  }

  // Lade Assistenten aus JSON-Datei
  private loadFromFile(): void {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = fs.readFileSync(this.dataFile, 'utf8');
        const assistants: Assistant[] = JSON.parse(data);
        
        // Lade in Map
        assistants.forEach(assistant => {
          this.assistants.set(assistant.id, assistant);
        });
        
        console.log(`✅ Loaded ${assistants.length} assistants from ${this.dataFile}`);
      } else {
        // Erstelle Default-Assistenten beim ersten Start
        this.initializeDefaultAssistants();
        this.saveToFile();
      }
    } catch (error) {
      console.error('❌ Error loading assistants from file:', error);
      // Fallback: Initialisiere Default-Assistenten
      this.initializeDefaultAssistants();
      this.saveToFile();
    }
  }

  // Speichere Assistenten in JSON-Datei
  private saveToFile(): void {
    try {
      const assistants = Array.from(this.assistants.values());
      fs.writeFileSync(this.dataFile, JSON.stringify(assistants, null, 2), 'utf8');
      console.log(`💾 Saved ${assistants.length} assistants to ${this.dataFile}`);
    } catch (error) {
      console.error('❌ Error saving assistants to file:', error);
    }
  }

  // Initialisiere Default-Assistenten
  private initializeDefaultAssistants(): void {
    const defaultAssistants: Assistant[] = [
      {
        id: '1',
        name: 'narrative',
        display_name: 'Narrative Coach',
        description: 'Ein spezialisierter Assistent für Storytelling, Kommunikation und narrative Entwicklung.',
        icon: '📖',
        api_url: 'https://kr.assistantos.de',
        jwt_token: process.env.ASSISTANT_OS_API_KEY || 'default-token',
        model_name: 'narrative-coach',
        system_prompt: 'Du bist ein Narrative Assistant, der bei Storytelling, Kommunikation und narrativer Entwicklung hilft. Du unterstützt Unternehmen und Personen dabei, ihre Geschichten wirkungsvoll zu erzählen und zu kommunizieren.',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'csrd',
        display_name: 'CSRD Coach',
        description: 'Experte für Corporate Sustainability Reporting Directive und Nachhaltigkeitsberichterstattung.',
        icon: '🌱',
        api_url: 'https://kr.assistantos.de',
        jwt_token: process.env.ASSISTANT_OS_API_KEY || 'default-token',
        model_name: 'csrd-coach',
        system_prompt: 'Du bist ein CSRD-Experte und hilfst bei der Corporate Sustainability Reporting Directive und Nachhaltigkeitsberichterstattung. Du kennst alle aktuellen Richtlinien und Standards.',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '3',
        name: 'adoption',
        display_name: 'Adoption Coach',
        description: 'Unterstützt bei Adoptionsprozessen und Change Management in Organisationen.',
        icon: '🚀',
        api_url: 'https://kr.assistantos.de',
        jwt_token: process.env.ASSISTANT_OS_API_KEY || 'default-token',
        model_name: 'adoption-coach',
        system_prompt: 'Du bist ein Adoption Coach, der bei Veränderungsprozessen und der Einführung neuer Systeme hilft. Du unterstützt Organisationen bei der erfolgreichen Umsetzung von Veränderungen.',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '4',
        name: 'image',
        display_name: 'Image Generator',
        description: 'Erstellt kreative Bilder und visuelle Inhalte basierend auf Textbeschreibungen.',
        icon: '🎨',
        api_url: 'https://kr.assistantos.de',
        jwt_token: process.env.ASSISTANT_OS_API_KEY || 'default-token',
        model_name: 'image',
        system_prompt: 'Du bist ein kreativer Image Generator, der Bilder basierend auf Beschreibungen erstellt.',
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Lade Default-Assistenten
    defaultAssistants.forEach(assistant => {
      this.assistants.set(assistant.id, assistant);
    });

    console.log('🔧 Initialized default assistants');
  }

  async findById(id: string): Promise<Assistant | null> {
    return this.assistants.get(id) || null;
  }

  async findByName(name: string): Promise<Assistant | null> {
    for (const assistant of this.assistants.values()) {
      if (assistant.name === name) {
        return assistant;
      }
    }
    return null;
  }

  async findAll(): Promise<Assistant[]> {
    return Array.from(this.assistants.values());
  }

  async findAllActive(): Promise<Assistant[]> {
    return Array.from(this.assistants.values()).filter(a => a.is_active);
  }

  async create(assistantData: Omit<Assistant, 'id' | 'created_at' | 'updated_at'>): Promise<Assistant> {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const assistant: Assistant = {
      ...assistantData,
      id,
      created_at: now,
      updated_at: now
    };

    this.assistants.set(id, assistant);
    this.saveToFile(); // Speichere nach Erstellung
    console.log(`✅ Created assistant: ${assistant.display_name} (${assistant.name})`);
    return assistant;
  }

  async update(id: string, assistantData: Partial<Assistant>): Promise<Assistant | null> {
    const existing = this.assistants.get(id);
    if (!existing) {
      return null;
    }

    const updated: Assistant = {
      ...existing,
      ...assistantData,
      id, // ID kann nicht geändert werden
      updated_at: new Date().toISOString()
    };

    this.assistants.set(id, updated);
    this.saveToFile(); // Speichere nach Update
    console.log(`✅ Updated assistant: ${updated.display_name} (${updated.name})`);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const assistant = this.assistants.get(id);
    const deleted = this.assistants.delete(id);
    
    if (deleted) {
      this.saveToFile(); // Speichere nach Löschung
      console.log(`✅ Deleted assistant: ${assistant?.display_name} (${assistant?.name})`);
    }
    
    return deleted;
  }

  // Hilfsmethode um JWT Token sicher zu bekommen (für API Calls)
  async getJwtToken(assistantId: string): Promise<string | null> {
    const assistant = await this.findById(assistantId);
    return assistant?.jwt_token || null;
  }
}

export const assistantModel = new AssistantModel(); 