import { useState, useCallback, useRef, useEffect } from 'react';
import { Assistant, Conversation, MessageFile } from '../types';
import { ApiService, StreamingResponseParser, ApiError, NetworkError } from '../services/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  error?: string;
  files?: MessageFile[]; // Uploaded files
  attachedFiles?: File[]; // Files being uploaded
  images?: string[]; // URLs for generated images
  metadata?: Record<string, any>;
}

export interface UseChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: boolean;
  error: string | null;
  conversation: Conversation | null;
  isConnected: boolean;
}

export interface UseChatActions {
  sendMessage: (content: string, files?: File[]) => Promise<void>;
  clearChat: () => void;
  retryLastMessage: () => Promise<void>;
  startNewConversation: () => void;
  loadConversation: (conversationId: string) => Promise<void>;
  uploadFiles: (files: File[]) => Promise<void>;
}

export interface UseChatReturn extends UseChatState, UseChatActions {}

export function useChat(assistant: Assistant | null): UseChatReturn {
  const [state, setState] = useState<UseChatState>({
    messages: [],
    isLoading: false,
    isTyping: false,
    error: null,
    conversation: null,
    isConnected: true,
  });

  const streamingParserRef = useRef(new StreamingResponseParser());
  const lastUserMessageRef = useRef<string>('');
  const lastFilesRef = useRef<File[]>([]);
  const initializingRef = useRef<boolean>(false); // Prevent concurrent initialization

  // DON'T initialize conversation automatically when assistant changes
  useEffect(() => {
    if (assistant) {
      // Just clear the chat when assistant changes, don't create conversation
      clearChat();
    } else {
      clearChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistant]);

  const initializeConversation = useCallback(async (): Promise<Conversation | null> => {
    if (!assistant || initializingRef.current) return null;

    initializingRef.current = true;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Create new conversation
      const response = await ApiService.createConversation(assistant.id);
      
      if (response.success && response.conversation) {
        // Convert backend conversation format to frontend format
        const conversation: Conversation = {
          id: response.conversation.id,
          user_id: '',
          skillbox_id: '',
          assistant_id: response.conversation.assistantId,
          title: response.conversation.title,
          is_active: true,
          created_at: response.conversation.created,
          updated_at: response.conversation.created,
        };

        setState(prev => ({
          ...prev,
          conversation: conversation,
          messages: [{
            id: `welcome-${Date.now()}`,
            role: 'assistant',
            content: `Hallo! Ich bin ${assistant.display_name}. Wie kann ich Ihnen helfen?`,
            timestamp: new Date(),
          }],
          isLoading: false,
        }));

        initializingRef.current = false;
        return conversation;
      } else {
        throw new Error('Failed to create conversation');
      }
    } catch (error) {
      console.error('Conversation initialization error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Fehler beim Erstellen der Unterhaltung',
        isLoading: false,
      }));
      initializingRef.current = false;
      throw error;
    }
  }, [assistant]);

  const loadConversation = useCallback(async (conversationId: string) => {
    if (!assistant || initializingRef.current) return;

    initializingRef.current = true;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Load conversation details
      const conversationResponse = await ApiService.getConversation(conversationId);
      
      if (!conversationResponse.success || !conversationResponse.data) {
        throw new Error('Failed to load conversation');
      }

      // Load conversation messages
      const messagesResponse = await ApiService.getConversationMessages(conversationId);
      
      if (!messagesResponse.success || !messagesResponse.data) {
        throw new Error('Failed to load conversation messages');
      }

      // Convert backend conversation format to frontend format
      const conversationData = conversationResponse.data;
      const conversation: Conversation = {
        ...conversationData,
        created_at: typeof conversationData.created_at === 'string' 
          ? conversationData.created_at 
          : new Date(conversationData.created_at).toISOString(),
        updated_at: typeof conversationData.updated_at === 'string' 
          ? conversationData.updated_at 
          : new Date(conversationData.updated_at).toISOString(),
        last_message_at: conversationData.last_message_at 
          ? (typeof conversationData.last_message_at === 'string' 
              ? conversationData.last_message_at 
              : new Date(conversationData.last_message_at).toISOString())
          : undefined
      };

      // Convert backend messages to frontend ChatMessage format
      const messages: ChatMessage[] = messagesResponse.data.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: typeof msg.created_at === 'string' ? new Date(msg.created_at) : new Date(msg.created_at),
        metadata: msg.metadata,
        files: msg.files
      }));

      setState(prev => ({
        ...prev,
        conversation: conversation,
        messages: messages,
        isLoading: false,
      }));

      initializingRef.current = false;
    } catch (error) {
      console.error('Error loading conversation:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Fehler beim Laden der Unterhaltung',
        isLoading: false,
      }));
      initializingRef.current = false;
      throw error;
    }
  }, [assistant]);

  const sendMessage = useCallback(async (content: string, files?: File[]) => {
    if (!assistant || !content.trim()) return;

    lastUserMessageRef.current = content;
    lastFilesRef.current = files || [];

    // Get current conversation or create one
    let activeConversation = state.conversation;
    
    // Only create a new conversation if we don't have one
    if (!activeConversation && !initializingRef.current) {
      try {
        activeConversation = await initializeConversation();
        if (!activeConversation) {
          setState(prev => ({
            ...prev,
            error: 'Fehler beim Erstellen der Unterhaltung',
          }));
          return;
        }
      } catch (error) {
        // Error is already set by initializeConversation
        return;
      }
    } else if (initializingRef.current) {
      // Wait for ongoing initialization or loading
      let attempts = 0;
      while (initializingRef.current && attempts < 50) { // Max 5 seconds wait
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      activeConversation = state.conversation;
    }

    // Final check
    if (!activeConversation) {
      setState(prev => ({
        ...prev,
        error: 'Fehler beim Laden der Unterhaltung',
      }));
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      attachedFiles: files,
    };

    // Add user message
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isTyping: true,
      error: null,
    }));

    try {
      // Create assistant message placeholder
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isLoading: true,
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));

      // Send message to AssistantOS
      const stream = await ApiService.sendChatMessage(
        assistant,
        content,
        activeConversation.id,
        files
      );

      // Process streaming response
      let fullContent = '';
      let detectedImages: string[] = [];

      for await (const chunk of streamingParserRef.current.parseStream(stream)) {
        fullContent += chunk;

        // Check for image URLs in the response
        const imageUrls = extractImageUrls(fullContent);
        if (imageUrls.length > 0) {
          detectedImages = imageUrls;
        }

        // Update message with streaming content
        setState(prev => ({
          ...prev,
          messages: prev.messages.map(msg =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: fullContent,
                  isLoading: false,
                  images: detectedImages.length > 0 ? detectedImages : undefined,
                }
              : msg
          ),
        }));
      }

      setState(prev => ({ ...prev, isTyping: false }));

    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage = error instanceof ApiError 
        ? error.message
        : error instanceof NetworkError
        ? 'Netzwerkfehler. Bitte versuchen Sie es erneut.'
        : 'Ein unerwarteter Fehler ist aufgetreten.';

      setState(prev => ({
        ...prev,
        isTyping: false,
        error: errorMessage,
        messages: prev.messages.map(msg =>
          msg.role === 'assistant' && msg.isLoading
            ? { ...msg, isLoading: false, error: errorMessage, content: 'Entschuldigung, es gab einen Fehler bei der Verarbeitung Ihrer Anfrage.' }
            : msg
        ),
      }));
    }
  }, [assistant, state.conversation]);

  const retryLastMessage = useCallback(async () => {
    if (lastUserMessageRef.current) {
      // Remove the last assistant message if it had an error
      setState(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => 
          !(msg.role === 'assistant' && msg.error)
        ),
      }));

      await sendMessage(lastUserMessageRef.current, lastFilesRef.current);
    }
  }, [sendMessage]);

  const clearChat = useCallback(() => {
    // Reset initialization flag
    initializingRef.current = false;
    
    setState({
      messages: [],
      isLoading: false,
      isTyping: false,
      error: null,
      conversation: null,
      isConnected: true,
    });
    lastUserMessageRef.current = '';
    lastFilesRef.current = [];
  }, []);

  const startNewConversation = useCallback(() => {
    clearChat();
    if (assistant) {
      // Don't immediately initialize, let it happen when first message is sent
      // This prevents unnecessary conversation creation
    }
  }, [assistant, clearChat]);

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!state.conversation) return;

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const uploadPromises = files.map(file => 
        ApiService.uploadFile(file, state.conversation!.id)
      );

      const results = await Promise.all(uploadPromises);
      
      // Add file upload confirmation messages
      results.forEach((result, index) => {
        if (result.success && result.data) {
          const fileMessage: ChatMessage = {
            id: `file-${Date.now()}-${index}`,
            role: 'user',
            content: `📎 Datei hochgeladen: ${result.data.filename}`,
            timestamp: new Date(),
          };

          setState(prev => ({
            ...prev,
            messages: [...prev.messages, fileMessage],
          }));
        }
      });

      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Fehler beim Hochladen der Dateien',
      }));
    }
  }, [state.conversation]);

  return {
    ...state,
    sendMessage,
    clearChat,
    retryLastMessage,
    startNewConversation,
    loadConversation,
    uploadFiles,
  };
}

// Utility function to extract image URLs from AI responses
function extractImageUrls(content: string): string[] {
  // Common patterns for image URLs in AI responses
  const patterns = [
    /https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)/gi,
    /!\[.*?\]\((https?:\/\/[^\s)]+)\)/gi, // Markdown image syntax
    /<img[^>]+src=["']([^"']+)["'][^>]*>/gi, // HTML img tags
  ];

  const urls: string[] = [];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const url = match[1] || match[0];
      if (url && !urls.includes(url)) {
        urls.push(url);
      }
    }
  });

  return urls;
}

export default useChat; 