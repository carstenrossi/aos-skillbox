import { Database, getDatabase } from '../database/database';

export interface Assistant {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  icon?: string;
  api_url: string;
  jwt_token?: string;
  model_name?: string;
  system_prompt?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAssistantRequest {
  name: string;
  display_name?: string;
  description?: string;
  icon?: string;
  api_url: string;
  jwt_token?: string;
  model_name?: string;
  system_prompt?: string;
  is_active?: boolean;
}

export interface UpdateAssistantRequest {
  name?: string;
  display_name?: string;
  description?: string;
  icon?: string;
  api_url?: string;
  jwt_token?: string;
  model_name?: string;
  system_prompt?: string;
  is_active?: boolean;
}

export class AssistantModelSQLite {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  async findAll(): Promise<Assistant[]> {
    const assistants = await this.db.all<Assistant>(
      'SELECT id, name, display_name, description, icon, api_url, jwt_token, model_name, system_prompt, is_active, created_at, updated_at FROM assistants ORDER BY created_at ASC'
    );
    
    // Konvertiere SQLite INTEGER zu JavaScript BOOLEAN
    const convertedAssistants = assistants.map(assistant => ({
      ...assistant,
      is_active: Boolean(assistant.is_active)
    }));
    
    console.log(`📋 Loaded ${convertedAssistants.length} assistants from database`);
    return convertedAssistants;
  }

  async findById(id: string): Promise<Assistant | null> {
    const assistant = await this.db.get<Assistant>(
      'SELECT id, name, display_name, description, icon, api_url, jwt_token, model_name, system_prompt, is_active, created_at, updated_at FROM assistants WHERE id = ?',
      [id]
    );
    
    if (assistant) {
      // Konvertiere SQLite INTEGER zu JavaScript BOOLEAN
      return {
        ...assistant,
        is_active: Boolean(assistant.is_active)
      };
    }
    
    return null;
  }

  async findByName(name: string): Promise<Assistant | null> {
    const assistant = await this.db.get<Assistant>(
      'SELECT id, name, display_name, description, icon, api_url, jwt_token, model_name, system_prompt, is_active, created_at, updated_at FROM assistants WHERE name = ?',
      [name]
    );
    
    if (assistant) {
      // Konvertiere SQLite INTEGER zu JavaScript BOOLEAN
      return {
        ...assistant,
        is_active: Boolean(assistant.is_active)
      };
    }
    
    return null;
  }

  async create(data: CreateAssistantRequest): Promise<Assistant> {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    await this.db.run(
      'INSERT INTO assistants (id, name, display_name, description, icon, api_url, jwt_token, model_name, system_prompt, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id, 
        data.name, 
        data.display_name || null, 
        data.description || null, 
        data.icon || null, 
        data.api_url, 
        data.jwt_token || null, 
        data.model_name || null, 
        data.system_prompt || null, 
        data.is_active !== false ? 1 : 0, 
        now, 
        now
      ]
    );
    
    const assistant = await this.findById(id);
    if (!assistant) {
      throw new Error('Failed to create assistant');
    }
    
    console.log(`✅ Created assistant: ${assistant.display_name || assistant.name} (${assistant.id})`);
    return assistant;
  }

  async update(id: string, data: UpdateAssistantRequest): Promise<Assistant | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }
    
    const updates: string[] = [];
    const params: any[] = [];
    
    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    
    if (data.display_name !== undefined) {
      updates.push('display_name = ?');
      params.push(data.display_name || null);
    }
    
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description || null);
    }
    
    if (data.icon !== undefined) {
      updates.push('icon = ?');
      params.push(data.icon || null);
    }
    
    if (data.api_url !== undefined) {
      updates.push('api_url = ?');
      params.push(data.api_url);
    }
    
    if (data.jwt_token !== undefined) {
      updates.push('jwt_token = ?');
      params.push(data.jwt_token || null);
    }
    
    if (data.model_name !== undefined) {
      updates.push('model_name = ?');
      params.push(data.model_name || null);
    }
    
    if (data.system_prompt !== undefined) {
      updates.push('system_prompt = ?');
      params.push(data.system_prompt || null);
    }
    
    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(data.is_active ? 1 : 0);
    }
    
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    
    params.push(id);
    
    await this.db.run(
      `UPDATE assistants SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    const updated = await this.findById(id);
    if (updated) {
      console.log(`✅ Updated assistant: ${updated.display_name || updated.name} (${updated.id})`);
    }
    
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }
    
    const result = await this.db.run('DELETE FROM assistants WHERE id = ?', [id]);
    
    if (result.changes && result.changes > 0) {
      console.log(`✅ Deleted assistant: ${existing.name} (${existing.id})`);
      return true;
    }
    
    return false;
  }

  async getAssistantForAuth(assistantId: string): Promise<{ jwt_token?: string; api_url: string } | null> {
    const assistant = await this.findById(assistantId);
    if (!assistant) {
      return null;
    }
    
    return {
      jwt_token: assistant.jwt_token,
      api_url: assistant.api_url
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Migration helper: Import from JSON file
  async importFromJSON(filePath: string): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      if (!fs.existsSync(filePath)) {
        console.log(`📄 JSON file not found: ${filePath}`);
        return;
      }
      
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      console.log(`📂 Importing ${data.length} assistants from JSON...`);
      
      for (const assistant of data) {
        // Check if assistant already exists
        const existing = await this.findById(assistant.id);
        if (existing) {
          console.log(`⏭️  Assistant ${assistant.display_name || assistant.name} already exists, skipping`);
          continue;
        }
        
        await this.db.run(
          'INSERT INTO assistants (id, name, display_name, description, icon, api_url, jwt_token, model_name, system_prompt, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            assistant.id,
            assistant.name,
            assistant.display_name || null,
            assistant.description || null,
            assistant.icon || null,
            assistant.api_url,
            assistant.jwt_token || null,
            assistant.model_name || null,
            assistant.system_prompt || null,
            assistant.is_active !== false ? 1 : 0,
            assistant.created_at || new Date().toISOString(),
            assistant.updated_at || new Date().toISOString()
          ]
        );
        
        console.log(`✅ Imported assistant: ${assistant.display_name || assistant.name}`);
      }
      
      console.log('🎉 JSON import completed');
    } catch (error) {
      console.error('🚨 Error importing from JSON:', error);
      throw error;
    }
  }

  // Migration helper: Export to JSON file for backup
  async exportToJSON(filePath: string): Promise<void> {
    try {
      const assistants = await this.findAll();
      const jsonData: Record<string, Assistant> = {};
      
      assistants.forEach(assistant => {
        jsonData[assistant.id] = assistant;
      });
      
      const fs = await import('fs');
      const path = await import('path');
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
      console.log(`✅ Exported ${assistants.length} assistants to ${filePath}`);
    } catch (error) {
      console.error('🚨 Error exporting to JSON:', error);
      throw error;
    }
  }

  // Create default assistants if database is empty
  async createDefaultAssistants(): Promise<void> {
    try {
      const existingAssistants = await this.findAll();
      
      if (existingAssistants.length > 0) {
        console.log(`📋 Found ${existingAssistants.length} existing assistants, skipping migration`);
        return;
      }
      
      console.log('🏗️  Database empty, migrating from JSON...');
      
      // Try to import from JSON file
      const path = await import('path');
      const jsonPath = path.join(__dirname, '../../data/assistants.json');
      
      try {
        await this.importFromJSON(jsonPath);
        console.log('🎉 Migration from JSON completed successfully');
      } catch (jsonError) {
        console.log('📄 JSON file not found, creating basic default assistants...');
        
        // Fallback: Create basic default assistants
        const defaultAssistants = [
          {
            id: '1',
            name: 'narrative',
            display_name: 'Narrative Coach',
            description: 'Ein spezialisierter Assistent für Storytelling, Kommunikation und narrative Entwicklung.',
            icon: '📖',
            api_url: 'https://kr.assistantos.de',
            jwt_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc1YmE3YTRlLTgzNjAtNDM2Mi1hYTVkLTU5OWI0NWQ0YjAzMCJ9.vMttlVgQPrMH4MjHO4koVFeltGTaqXG9_ds-ZdzrWxY',
            model_name: 'narrative-coach',
            system_prompt: 'Du bist ein Narrative Assistant, der bei Storytelling, Kommunikation und narrativer Entwicklung hilft.',
            is_active: true
          },
          {
            id: '2',
            name: 'csrd',
            display_name: 'CSRD Coach',
            description: 'Experte für Corporate Sustainability Reporting Directive und Nachhaltigkeitsberichterstattung.',
            icon: '🌱',
            api_url: 'https://kr.assistantos.de',
            jwt_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc1YmE3YTRlLTgzNjAtNDM2Mi1hYTVkLTU5OWI0NWQ0YjAzMCJ9.vMttlVgQPrMH4MjHO4koVFeltGTaqXG9_ds-ZdzrWxY',
            model_name: 'csrd-coach',
            system_prompt: 'Du bist ein CSRD-Experte und hilfst bei der Corporate Sustainability Reporting Directive.',
            is_active: true
          },
          {
            id: '3',
            name: 'adoption',
            display_name: 'Adoption Coach',
            description: 'Unterstützt bei Adoptionsprozessen und Change Management in Organisationen.',
            icon: '🚀',
            api_url: 'https://kr.assistantos.de',
            jwt_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc1YmE3YTRlLTgzNjAtNDM2Mi1hYTVkLTU5OWI0NWQ0YjAzMCJ9.vMttlVgQPrMH4MjHO4koVFeltGTaqXG9_ds-ZdzrWxY',
            model_name: 'adoption-coach',
            system_prompt: 'Du bist ein Adoption Coach, der bei Veränderungsprozessen hilft.',
            is_active: true
          },
          {
            id: '6f0eb85f-3366-4cc6-83b7-86de15b0562d',
            name: 'aossupport',
            display_name: 'AOS Support',
            description: 'Hilft bei AssistantOS',
            icon: '🤖',
            api_url: 'https://kr.assistantos.de',
            jwt_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc1YmE3YTRlLTgzNjAtNDM2Mi1hYTVkLTU5OWI0NWQ0YjAzMCJ9.vMttlVgQPrMH4MjHO4koVFeltGTaqXG9_ds-ZdzrWxY',
            model_name: 'assistantos-support',
            system_prompt: 'Du bist ein AssistantOS Support-Assistent.',
            is_active: true
          }
        ];
        
        for (const defaultAssistant of defaultAssistants) {
          await this.create(defaultAssistant);
        }
        
        console.log('🎉 Default assistants created successfully');
      }
    } catch (error) {
      console.error('🚨 Error creating default assistants:', error);
      throw error;
    }
  }
}

// Factory function
export const createAssistantModel = (database: Database): AssistantModelSQLite => {
  return new AssistantModelSQLite(database);
};

// Singleton instance
let assistantModel: AssistantModelSQLite | null = null;

export const getAssistantModel = (): AssistantModelSQLite => {
  if (!assistantModel) {
    const db = getDatabase();
    assistantModel = new AssistantModelSQLite(db);
  }
  return assistantModel;
}; 