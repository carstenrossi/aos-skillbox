import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChatModalProps, SupportedLanguage, Conversation } from '../types';
import { X, Send, Upload, Plus, MessageSquare, ChevronLeft, ChevronRight, Paperclip, File } from 'lucide-react';
import { translations } from '../utils/translations';
import { useChat } from '../hooks/useChat';
import ImageGallery from './ImageGallery';
import AudioPlayer from './AudioPlayer';
import FileUpload from './FileUpload';
import ConversationList from './ConversationList';
import { ApiService } from '../services/api';

interface ChatModalWithHistoryProps extends ChatModalProps {
  assistants: any[]; // Array of all assistants for the sidebar
  user?: any; // Current logged in user
}

// Helper function to convert markdown links to HTML
const renderMarkdownLinks = (text: string, isUserMessage: boolean = false) => {
  // Convert [text](url) to clickable links
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    // Add the clickable link with appropriate colors
    const linkClasses = isUserMessage 
      ? "text-white hover:text-gray-200 underline underline-offset-2" 
      : "text-blue-600 hover:text-blue-800 underline";
    
    parts.push(
      <a
        key={match.index}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClasses}
      >
        {match[1]}
      </a>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 1 ? parts : text;
};

const ChatModalWithHistory: React.FC<ChatModalWithHistoryProps> = ({
  isOpen,
  onClose,
  assistant,
  conversation,
  assistants,
  user,
}) => {
  const [message, setMessage] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [language] = useState<SupportedLanguage>('de');
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(conversation || null);
  const [currentAssistant, setCurrentAssistant] = useState(assistant);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get authentication status from user prop
  const isAuthenticated = !!user;

  const chatHook = useChat(currentAssistant);
  const {
    messages: hookMessages,
    isLoading,
    isTyping,
    error,
    sendMessage,
    retryLastMessage,
    startNewConversation,
    loadConversation,
    uploadFiles,
    clearChat: safeClearChat,
  } = chatHook;

  // Use hook messages directly (loadConversation will manage the state)
  const messages = hookMessages;

  // Override functions if not authenticated - memoized to prevent re-renders
  const safeSendMessage = useMemo(() => 
    isAuthenticated ? sendMessage : async () => {}, 
    [isAuthenticated, sendMessage]
  );
  
  const safeRetryLastMessage = useMemo(() => 
    isAuthenticated ? retryLastMessage : async () => {}, 
    [isAuthenticated, retryLastMessage]
  );
  
  const safeStartNewConversation = useMemo(() => 
    isAuthenticated ? startNewConversation : async () => {}, 
    [isAuthenticated, startNewConversation]
  );
  
  const safeUploadFiles = useMemo(() => 
    isAuthenticated ? uploadFiles : async () => {}, 
    [isAuthenticated, uploadFiles]
  );

  const t = translations[language];

  // Load conversation messages when selectedConversation changes
  useEffect(() => {
    const loadConversationMessages = async () => {
      if (!selectedConversation?.id || !isAuthenticated || !currentAssistant) {
        return;
      }
      
      // Ensure the current assistant matches the conversation's assistant
      if (currentAssistant.id !== selectedConversation.assistant_id) {
        return; // Wait for the assistant to be updated
      }
      
      try {
        console.log('Loading conversation:', selectedConversation.id);
        
        // Use the loadConversation from useChat hook directly
        if (isAuthenticated) {
          await loadConversation(selectedConversation.id);
        }
        
        console.log('Conversation loaded successfully');
      } catch (error) {
        console.error('Error loading conversation:', error);
      }
    };

    loadConversationMessages();
  }, [selectedConversation?.id, isAuthenticated, currentAssistant?.id, loadConversation]);

  // Combine history messages with current messages - simplified since useChat manages all state now
  const allMessages = messages;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, isTyping]);

  const handleClose = () => {
    setMessage('');
    setShowFileUpload(false);
    setSelectedFiles([]);
    setSelectedConversation(null);
    onClose();
  };

  const handleSend = async () => {
    if ((!message.trim() && selectedFiles.length === 0) || isTyping || !isAuthenticated) return;

    let finalMessage = message;

    // If files are selected, upload them first and create a message with URLs
    if (selectedFiles.length > 0) {
      try {
        // Upload files and collect results
        const uploadPromises = selectedFiles.map(file => ApiService.uploadFile(file, selectedConversation?.id));
        const uploadResults = await Promise.all(uploadPromises);
        
        // Create message with file information as clickable links
        const fileInfos = uploadResults.map((result: any, index: number) => {
          if (result.success && result.data) {
            return `📎 [${result.data.originalName}](${result.data.s3Url})`;
          } else {
            return `❌ ${selectedFiles[index].name} (Upload fehlgeschlagen)`;
          }
        }).join('\n');

        // Use file info as message if no text message provided
        if (!message.trim()) {
          finalMessage = fileInfos;
        } else {
          finalMessage = `${message}\n\n${fileInfos}`;
        }
      } catch (error) {
        console.error('Error uploading files:', error);
        finalMessage = message || '❌ Fehler beim Hochladen der Dateien';
      }
    }

    // Send message (with files so they get properly attached to conversation)
    await safeSendMessage(finalMessage, selectedFiles);
    setMessage('');
    setSelectedFiles([]);
    setShowFileUpload(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (!isAuthenticated) return;
    await safeUploadFiles(files);
    setShowFileUpload(false);
  };

  const handleFilesSelected = (files: File[]) => {
    console.log('Files selected:', files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleConversationSelect = useCallback((conversation: Conversation) => {
    if (!isAuthenticated) return;
    
    // Switch to the assistant for this conversation FIRST
    const conversationAssistant = assistants.find(a => a.id === conversation.assistant_id);
    if (conversationAssistant && conversationAssistant.id !== currentAssistant?.id) {
      setCurrentAssistant(conversationAssistant);
    }
    
    setSelectedConversation(conversation);
    // The useEffect will handle loading the conversation once currentAssistant is updated
  }, [isAuthenticated, assistants, currentAssistant?.id]);

  const handleNewConversation = useCallback(async (assistantId: string) => {
    if (!isAuthenticated) return;
    const newAssistant = assistants.find(a => a.id === assistantId);
    if (newAssistant) {
      setCurrentAssistant(newAssistant);
      setSelectedConversation(null);
      // Clear existing messages when starting new conversation
      if (isAuthenticated) {
        await startNewConversation();
      }
    }
  }, [isAuthenticated, assistants, startNewConversation]);

  if (!isOpen) return null;

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="modal-overlay" onClick={handleClose}>
        <div 
          className="glass rounded-3xl w-full max-w-md h-auto p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Anmeldung erforderlich</h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors focus-skillbox"
                aria-label="Schließen"
              >
                <X size={24} />
              </button>
            </div>
            
            <MessageSquare size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-6">
              Bitte melden Sie sich an, um mit den Assistenten zu chatten.
            </p>
            <button
              onClick={handleClose}
              className="w-full text-white py-2 px-4 rounded-md transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#84dcc6' }}
            >
              Zur Anmeldung
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div 
        className="glass rounded-3xl w-full max-w-7xl h-[90vh] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 border-r border-gray-200 flex flex-col bg-white/50">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Unterhaltungen</h3>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <ConversationList
                assistants={assistants}
                selectedConversationId={selectedConversation?.id}
                onConversationSelect={handleConversationSelect}
                onNewConversation={handleNewConversation}
                currentAssistantId={currentAssistant?.id}
              />
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white/50">
            <div className="flex items-center space-x-3">
              {!showSidebar && (
                <button
                  onClick={() => setShowSidebar(true)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              )}
              
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: '#84dcc6' }}
                >
                  {currentAssistant?.icon || currentAssistant?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800">
                    {currentAssistant?.display_name || currentAssistant?.name || 'Assistent'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {selectedConversation?.title || 'Neue Unterhaltung'}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors focus-skillbox"
              aria-label="Schließen"
            >
              <X size={24} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {allMessages.filter(msg => !msg.isLoading).map((msg, index) => (
              <div
                key={msg.id || index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-skillbox-purple text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{renderMarkdownLinks(msg.content, msg.role === 'user')}</div>
                  
                  {/* Display attached files */}
                  {msg.files && msg.files.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.files.map((file, fileIndex) => (
                        <div key={fileIndex} className="flex items-center space-x-2 text-sm opacity-75">
                          <File size={14} />
                          <span>{file.filename}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Display images if any */}
                  {msg.images && msg.images.length > 0 && (
                    <div className="mt-3">
                      <ImageGallery images={msg.images} />
                    </div>
                  )}
                  
                  {msg.error && (
                    <div className="mt-2 text-red-500 text-sm">
                      {msg.error}
                      <button
                        onClick={safeRetryLastMessage}
                        className="ml-2 underline hover:no-underline"
                      >
                        Wiederholen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 text-gray-800 p-3 rounded-2xl">
                  <div className="flex items-center justify-center">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Selected Files Display */}
          {selectedFiles.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-2 mb-2">
                <Paperclip size={16} className="text-gray-500" />
                <span className="text-sm text-gray-600">Ausgewählte Dateien ({selectedFiles.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center space-x-2 bg-white px-3 py-1 rounded-full border">
                    <File size={14} className="text-gray-500" />
                    <span className="text-sm text-gray-700 truncate max-w-32">{file.name}</span>
                    <button
                      onClick={() => removeSelectedFile(index)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200 bg-white/50">
            {error && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center space-x-3">
              {/* File Upload Button */}
              <button
                onClick={() => setShowFileUpload(!showFileUpload)}
                className="flex-shrink-0 w-11 h-11 flex items-center justify-center text-gray-500 hover:text-skillbox-purple hover:bg-gray-100 rounded-full transition-colors border border-gray-300"
                title="Dateien anhängen"
              >
                <Paperclip size={22} />
              </button>

              {/* Message Input */}
              <div className="flex-1">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={selectedFiles.length > 0 ? "Nachricht (optional)..." : "Nachricht eingeben..."}
                  className="w-full p-3 border border-gray-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-skillbox-purple focus:border-transparent"
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                  disabled={isTyping}
                />
              </div>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={(!message.trim() && selectedFiles.length === 0) || isTyping}
                className="flex-shrink-0 w-11 h-11 flex items-center justify-center bg-skillbox-purple text-white rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={22} />
              </button>
            </div>

            {/* File Upload Area */}
            {showFileUpload && (
              <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-white">
                <FileUpload
                  onFilesSelected={handleFilesSelected}
                  maxFiles={5}
                  maxSize={10}
                  className="border-none p-0"
                  language={language}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModalWithHistory; 