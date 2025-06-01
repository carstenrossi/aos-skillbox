import { getDatabase, Database } from '../database/database';
import { Conversation, Message } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ConversationModel {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  // Create a new conversation
  async create(data: {
    user_id: string;
    assistant_id: string;
    title?: string;
  }): Promise<Conversation> {
    const id = uuidv4();
    const title = data.title || `Conversation with Assistant`;
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO conversations (id, user_id, assistant_id, title, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.user_id, data.assistant_id, title, now, now]
    );

    const conversation = await this.findById(id);
    if (!conversation) {
      throw new Error('Failed to create conversation');
    }

    return conversation;
  }

  // Find conversation by ID
  async findById(id: string): Promise<Conversation | null> {
    const row = await this.db.get<any>(
      'SELECT * FROM conversations WHERE id = ?',
      [id]
    );

    if (!row) return null;

    return {
      id: row.id,
      user_id: row.user_id,
      assistant_id: row.assistant_id,
      title: row.title,
      is_active: Boolean(row.is_active),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      last_message_at: row.last_message_at ? new Date(row.last_message_at) : undefined
    };
  }

  // Find conversations by user ID
  async findByUserId(
    user_id: string,
    options: {
      assistant_id?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Conversation[]> {
    let query = `
      SELECT c.*, a.name as assistant_name, a.display_name as assistant_display_name
      FROM conversations c
      LEFT JOIN assistants a ON c.assistant_id = a.id
      WHERE c.user_id = ? AND c.is_active = 1
    `;
    
    const params: any[] = [user_id];

    if (options.assistant_id) {
      query += ' AND c.assistant_id = ?';
      params.push(options.assistant_id);
    }

    query += ' ORDER BY COALESCE(c.last_message_at, c.created_at) DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
      
      if (options.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const rows = await this.db.all<any>(query, params);

    return rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      assistant_id: row.assistant_id,
      title: row.title,
      is_active: Boolean(row.is_active),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      last_message_at: row.last_message_at ? new Date(row.last_message_at) : undefined
    }));
  }

  // Update conversation
  async update(id: string, data: {
    title?: string;
    is_active?: boolean;
    last_message_at?: Date;
  }): Promise<Conversation | null> {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }

    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(data.is_active ? 1 : 0);
    }

    if (data.last_message_at !== undefined) {
      updates.push('last_message_at = ?');
      params.push(data.last_message_at.toISOString());
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    await this.db.run(
      `UPDATE conversations SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.findById(id);
  }

  // Delete conversation (soft delete)
  async delete(id: string): Promise<boolean> {
    const result = await this.db.run(
      'UPDATE conversations SET is_active = 0, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id]
    );

    return result.changes > 0;
  }

  // Hard delete conversation and all messages
  async hardDelete(id: string): Promise<boolean> {
    // Delete all messages first (foreign key constraint)
    await this.db.run('DELETE FROM messages WHERE conversation_id = ?', [id]);
    
    const result = await this.db.run('DELETE FROM conversations WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // Get conversation count for user
  async getCountByUserId(user_id: string, assistant_id?: string): Promise<number> {
    let query = 'SELECT COUNT(*) as count FROM conversations WHERE user_id = ? AND is_active = 1';
    const params: any[] = [user_id];

    if (assistant_id) {
      query += ' AND assistant_id = ?';
      params.push(assistant_id);
    }

    const result = await this.db.get<{ count: number }>(query, params);
    return result?.count || 0;
  }
}

export class MessageModel {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  // Create a new message
  async create(data: {
    conversation_id: string;
    role: 'user' | 'assistant';
    content: string;
    metadata?: Record<string, any>;
  }): Promise<Message> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const metadata = data.metadata ? JSON.stringify(data.metadata) : null;

    await this.db.run(
      `INSERT INTO messages (id, conversation_id, role, content, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.conversation_id, data.role, data.content, metadata, now]
    );

    // Update conversation's last_message_at
    await this.db.run(
      'UPDATE conversations SET last_message_at = ?, updated_at = ? WHERE id = ?',
      [now, now, data.conversation_id]
    );

    const message = await this.findById(id);
    if (!message) {
      throw new Error('Failed to create message');
    }

    return message;
  }

  // Find message by ID
  async findById(id: string): Promise<Message | null> {
    const row = await this.db.get<any>(
      'SELECT * FROM messages WHERE id = ?',
      [id]
    );

    if (!row) return null;

    return {
      id: row.id,
      conversation_id: row.conversation_id,
      role: row.role as 'user' | 'assistant',
      content: row.content,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      created_at: new Date(row.created_at)
    };
  }

  // Find messages by conversation ID
  async findByConversationId(
    conversation_id: string,
    options: {
      limit?: number;
      offset?: number;
      order?: 'asc' | 'desc';
    } = {}
  ): Promise<Message[]> {
    const order = options.order || 'asc';
    let query = `
      SELECT * FROM messages 
      WHERE conversation_id = ? 
      ORDER BY created_at ${order}
    `;
    
    const params: any[] = [conversation_id];

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
      
      if (options.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const rows = await this.db.all<any>(query, params);

    return rows.map(row => ({
      id: row.id,
      conversation_id: row.conversation_id,
      role: row.role as 'user' | 'assistant',
      content: row.content,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      created_at: new Date(row.created_at)
    }));
  }

  // Delete message
  async delete(id: string): Promise<boolean> {
    const result = await this.db.run('DELETE FROM messages WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // Get message count for conversation
  async getCountByConversationId(conversation_id: string): Promise<number> {
    const result = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?',
      [conversation_id]
    );
    return result?.count || 0;
  }
}

// Singleton instances
let conversationModel: ConversationModel;
let messageModel: MessageModel;

export const getConversationModel = (): ConversationModel => {
  if (!conversationModel) {
    conversationModel = new ConversationModel(getDatabase());
  }
  return conversationModel;
};

export const getMessageModel = (): MessageModel => {
  if (!messageModel) {
    messageModel = new MessageModel(getDatabase());
  }
  return messageModel;
}; 