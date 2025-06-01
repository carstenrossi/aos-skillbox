import { Database } from 'sqlite3';

export interface Tool {
  id?: number;
  name: string;
  description: string;
  url: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  is_external: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateToolRequest {
  name: string;
  description: string;
  url: string;
  icon: string;
  sort_order?: number;
  is_active?: boolean;
  is_external?: boolean;
}

export interface UpdateToolRequest {
  name?: string;
  description?: string;
  url?: string;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
  is_external?: boolean;
}

export class ToolModel {
  constructor(private db: Database) {}

  /**
   * Alle aktiven Tools für Frontend abrufen (sortiert nach sort_order)
   */
  async getActiveTools(): Promise<Tool[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM tools 
        WHERE is_active = 1 
        ORDER BY sort_order ASC, created_at ASC
      `;
      
      this.db.all(sql, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => ({
            ...row,
            is_active: Boolean(row.is_active),
            is_external: Boolean(row.is_external)
          })));
        }
      });
    });
  }

  /**
   * Alle Tools für Admin-Panel abrufen (auch inaktive)
   */
  async getAllTools(): Promise<Tool[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM tools 
        ORDER BY sort_order ASC, created_at ASC
      `;
      
      this.db.all(sql, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => ({
            ...row,
            is_active: Boolean(row.is_active),
            is_external: Boolean(row.is_external)
          })));
        }
      });
    });
  }

  /**
   * Tool nach ID abrufen
   */
  async getToolById(id: number): Promise<Tool | null> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM tools WHERE id = ?`;
      
      this.db.get(sql, [id], (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          if (row) {
            resolve({
              ...row,
              is_active: Boolean(row.is_active),
              is_external: Boolean(row.is_external)
            });
          } else {
            resolve(null);
          }
        }
      });
    });
  }

  /**
   * Neues Tool erstellen
   */
  async createTool(toolData: CreateToolRequest, createdBy: string): Promise<Tool> {
    return new Promise((resolve, reject) => {
      // Wenn keine sort_order angegeben, die nächste verfügbare verwenden
      if (toolData.sort_order === undefined) {
        this.getNextSortOrder().then(nextOrder => {
          this.insertTool({ ...toolData, sort_order: nextOrder }, createdBy, resolve, reject);
        }).catch(reject);
      } else {
        this.insertTool(toolData as CreateToolRequest & { sort_order: number }, createdBy, resolve, reject);
      }
    });
  }

  private insertTool(
    toolData: CreateToolRequest & { sort_order: number }, 
    createdBy: string, 
    resolve: Function, 
    reject: Function
  ) {
    const sql = `
      INSERT INTO tools (name, description, url, icon, sort_order, is_active, is_external, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      toolData.name,
      toolData.description,
      toolData.url,
      toolData.icon,
      toolData.sort_order,
      toolData.is_active ?? true,
      toolData.is_external ?? true,
      createdBy
    ];

    const db = this.db; // Referenz für Callback speichern
    this.db.run(sql, values, function(err) {
      if (err) {
        reject(err);
      } else {
        // Tool mit neuer ID abrufen - verwende gespeicherte db-Referenz
        const getToolSql = `SELECT * FROM tools WHERE id = ?`;
        db.get(getToolSql, [this.lastID], (err: any, row: any) => {
          if (err) {
            reject(err);
          } else if (row) {
            resolve({
              ...row,
              is_active: Boolean(row.is_active),
              is_external: Boolean(row.is_external)
            });
          } else {
            reject(new Error('Failed to retrieve created tool'));
          }
        });
      }
    });
  }

  /**
   * Tool aktualisieren
   */
  async updateTool(id: number, toolData: UpdateToolRequest, updatedBy: string): Promise<Tool | null> {
    return new Promise((resolve, reject) => {
      // Erst prüfen ob Tool existiert
      this.getToolById(id).then(existingTool => {
        if (!existingTool) {
          resolve(null);
          return;
        }

        const updateFields: string[] = [];
        const values: any[] = [];

        if (toolData.name !== undefined) {
          updateFields.push('name = ?');
          values.push(toolData.name);
        }
        if (toolData.description !== undefined) {
          updateFields.push('description = ?');
          values.push(toolData.description);
        }
        if (toolData.url !== undefined) {
          updateFields.push('url = ?');
          values.push(toolData.url);
        }
        if (toolData.icon !== undefined) {
          updateFields.push('icon = ?');
          values.push(toolData.icon);
        }
        if (toolData.sort_order !== undefined) {
          updateFields.push('sort_order = ?');
          values.push(toolData.sort_order);
        }
        if (toolData.is_active !== undefined) {
          updateFields.push('is_active = ?');
          values.push(toolData.is_active);
        }
        if (toolData.is_external !== undefined) {
          updateFields.push('is_external = ?');
          values.push(toolData.is_external);
        }

        updateFields.push('updated_by = ?');
        values.push(updatedBy);

        values.push(id);

        const sql = `
          UPDATE tools 
          SET ${updateFields.join(', ')}
          WHERE id = ?
        `;

        this.db.run(sql, values, (err) => {
          if (err) {
            reject(err);
          } else {
            // Aktualisiertes Tool abrufen
            this.getToolById(id).then(resolve).catch(reject);
          }
        });
      }).catch(reject);
    });
  }

  /**
   * Tool löschen
   */
  async deleteTool(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM tools WHERE id = ?`;
      
      this.db.run(sql, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  /**
   * Sortierung von Tools aktualisieren
   */
  async updateToolsOrder(toolIds: number[]): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        let completed = 0;
        let hasError = false;

        toolIds.forEach((toolId, index) => {
          if (hasError) return;

          const sql = `UPDATE tools SET sort_order = ? WHERE id = ?`;
          this.db.run(sql, [index, toolId], (err) => {
            if (err && !hasError) {
              hasError = true;
              this.db.run('ROLLBACK');
              reject(err);
              return;
            }

            completed++;
            if (completed === toolIds.length && !hasError) {
              this.db.run('COMMIT', (err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(true);
                }
              });
            }
          });
        });

        if (toolIds.length === 0) {
          this.db.run('COMMIT');
          resolve(true);
        }
      });
    });
  }

  /**
   * Nächste verfügbare Sort-Order ermitteln
   */
  private async getNextSortOrder(): Promise<number> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT MAX(sort_order) as max_order FROM tools`;
      
      this.db.get(sql, [], (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve((row?.max_order || 0) + 1);
        }
      });
    });
  }
} 