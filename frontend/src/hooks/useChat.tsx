import React, { useState, useCallback } from 'react';
import { Assistant, Conversation, Message } from '../types';
import { ApiService } from '../services/api';

interface ChatMessage extends Message {
  isLoading?: boolean;
  error?: string;
  attachedFiles?: File[];
  images?: string[];
  timestamp: Date;
  streaming?: boolean;
}

interface UseChatReturn {
  messages: ChatMessage[];
  conversation: Conversation | null;
  isLoading: boolean;
  isTyping: boolean;
  error: string | null;
  sendMessage: (content: string, files?: File[]) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  startNewConversation: () => Promise<void>;
  uploadFiles: (files: File[]) => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
}

export const useChat = (assistant?: Assistant): UseChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string>('');

  // Load conversation function
  const loadConversation = useCallback(async (conversationId: string) => {
    if (!conversationId) return;
    
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token available, skipping conversation load');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);

      // Load conversation details
      const convResponse = await ApiService.getConversation(conversationId);
      if (convResponse.success && convResponse.data) {
        setConversation(convResponse.data);
      }

      // Load messages
      const messagesResponse = await ApiService.getConversationMessages(conversationId);
      if (messagesResponse.success && messagesResponse.data) {
        const chatMessages: ChatMessage[] = messagesResponse.data.map((msg: Message) => ({
          ...msg,
          timestamp: new Date(msg.created_at),
          isLoading: false
        }));
        setMessages(chatMessages);
      }
    } catch (err: any) {
      console.error('Failed to load conversation:', err);
      setError('Fehler beim Laden der Unterhaltung');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start new conversation
  const startNewConversation = useCallback(async () => {
    if (!assistant) return;

    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token available, skipping new conversation');
      setError('Sie müssen angemeldet sein, um eine neue Unterhaltung zu starten');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setMessages([]);
      setConversation(null);

      const response = await ApiService.createConversation(assistant.id);

      if (response.success && response.conversation) {
        const newConversation: Conversation = {
          id: response.conversation.id,
          user_id: '', // Will be filled by backend
          skillbox_id: '', // Multi-tenancy not implemented yet
          assistant_id: assistant.id,
          title: response.conversation.title,
          is_active: true,
          created_at: new Date(response.conversation.created).toISOString(),
          updated_at: new Date(response.conversation.created).toISOString()
        };
        setConversation(newConversation);
      }
    } catch (err: any) {
      console.error('Failed to start new conversation:', err);
      setError('Fehler beim Starten einer neuen Unterhaltung');
    } finally {
      setIsLoading(false);
    }
  }, [assistant]);

  // Send message
  const sendMessage = useCallback(async (content: string, files?: File[]) => {
    if (!assistant || !content.trim()) return;

    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token available, skipping message send');
      setError('Sie müssen angemeldet sein, um Nachrichten zu senden');
      return;
    }

    // If no conversation exists, create one first
    if (!conversation) {
      await startNewConversation();
      // Wait a bit for conversation to be created
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!conversation) {
      setError('Keine aktive Unterhaltung');
      return;
    }

    setLastMessage(content);
    setError(null);

    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversation.id,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      timestamp: new Date(),
      attachedFiles: files
    };

    setMessages(prev => [...prev, userMessage]);

    // Add loading message for AI response
    const loadingMessage: ChatMessage = {
      id: `loading-${Date.now()}`,
      conversation_id: conversation.id,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, loadingMessage]);
    setIsTyping(true);

    try {
      const response = await ApiService.sendMessage(conversation.id, content, files);

      // Remove loading message
      setMessages(prev => prev.filter(msg => !msg.isLoading));

      if (response.response) {
        // Add actual AI response
        const aiMessage: ChatMessage = {
          id: response.messageId || `ai-${Date.now()}`,
          conversation_id: conversation.id,
          role: 'assistant',
          content: response.response,
          created_at: response.timestamp,
          timestamp: new Date(response.timestamp)
        };

        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      
      // Remove loading message and add error message
      setMessages(prev => prev.filter(msg => !msg.isLoading));
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Es tut mir leid, ich kann momentan nicht antworten. Bitte versuchen Sie es später erneut.',
        created_at: new Date().toISOString(),
        timestamp: new Date(),
        error: err.message
      };

      setMessages(prev => [...prev, errorMessage]);
      setError(err.message);
    } finally {
      setIsTyping(false);
    }
  }, [assistant, conversation, startNewConversation]);

  // Retry last message
  const retryLastMessage = useCallback(async () => {
    if (lastMessage) {
      await sendMessage(lastMessage);
    }
  }, [lastMessage, sendMessage]);

  // Upload files (placeholder implementation)
  const uploadFiles = useCallback(async (files: File[]) => {
    console.log('Uploading files:', files);
    // TODO: Implement file upload to backend
    setError('Datei-Upload noch nicht implementiert');
  }, []);

  return {
    messages,
    conversation,
    isLoading,
    isTyping,
    error,
    sendMessage,
    retryLastMessage,
    startNewConversation,
    uploadFiles,
    loadConversation
  };
}; 