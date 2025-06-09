import React, { useState, useEffect, useRef } from 'react';
import { ChatModalProps, SupportedLanguage, Conversation } from '../types';
import { X, Send, Upload, Plus, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { translations } from '../utils/translations';
import { useChat } from '../hooks/useChat';
import ImageGallery from './ImageGallery';
import AudioPlayer from './AudioPlayer';
import FileUpload from './FileUpload';
import ConversationList from './ConversationList';

interface ChatModalWithHistoryProps extends ChatModalProps {
  assistants: any[]; // Array of all assistants for the sidebar
  user?: any; // Current logged in user
}

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
  const [language] = useState<SupportedLanguage>('de');
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(conversation || null);
  const [currentAssistant, setCurrentAssistant] = useState(assistant);
  const [historyMessages, setHistoryMessages] = useState<any[]>([]);
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

  // Override functions if not authenticated
  const safeSendMessage = isAuthenticated ? sendMessage : async () => {};
  const safeRetryLastMessage = isAuthenticated ? retryLastMessage : async () => {};
  const safeStartNewConversation = isAuthenticated ? startNewConversation : async () => {};
  const safeLoadConversation = isAuthenticated ? loadConversation : async () => {};
  const safeUploadFiles = isAuthenticated ? uploadFiles : async () => {};

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
        
        // Use the loadConversation from useChat hook
        await safeLoadConversation(selectedConversation.id);
        
        console.log('Conversation loaded successfully');
      } catch (error) {
        console.error('Error loading conversation:', error);
      }
    };

    loadConversationMessages();
  }, [selectedConversation, isAuthenticated, currentAssistant, safeLoadConversation]);

  // Combine history messages with current messages - simplified since useChat manages all state now
  const allMessages = messages;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, isTyping]);

  const handleClose = () => {
    setMessage('');
    setShowFileUpload(false);
    setSelectedConversation(null);
    onClose();
  };

  const handleSend = async () => {
    if (!message.trim() || isTyping || !isAuthenticated) return;

    await safeSendMessage(message);
    setMessage('');
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
  };

  const handleConversationSelect = (conversation: Conversation) => {
    if (!isAuthenticated) return;
    
    // Switch to the assistant for this conversation FIRST
    const conversationAssistant = assistants.find(a => a.id === conversation.assistant_id);
    if (conversationAssistant && conversationAssistant.id !== currentAssistant?.id) {
      setCurrentAssistant(conversationAssistant);
    }
    
    setSelectedConversation(conversation);
    setHistoryMessages([]); // Clear previous messages
    // The useEffect will handle loading the conversation once currentAssistant is updated
  };

  const handleNewConversation = async (assistantId: string) => {
    if (!isAuthenticated) return;
    const newAssistant = assistants.find(a => a.id === assistantId);
    if (newAssistant) {
      setCurrentAssistant(newAssistant);
      setSelectedConversation(null);
      setHistoryMessages([]); // Clear history messages
      // Clear existing messages when starting new conversation
      await safeStartNewConversation();
    }
  };

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
        <div className={`transition-all duration-300 ${showSidebar ? 'w-80' : 'w-0'} overflow-hidden border-r border-gray-200 bg-white/50`}>
          {isAuthenticated && currentAssistant ? (
            <ConversationList
              assistants={[currentAssistant]}
              selectedConversationId={selectedConversation?.id}
              onConversationSelect={handleConversationSelect}
              onNewConversation={handleNewConversation}
              className="h-full"
              currentAssistantId={currentAssistant.id}
            />
          ) : (
            <div className="h-full flex items-center justify-center p-4">
              <div className="text-center text-gray-500">
                <p className="text-sm">
                  {!isAuthenticated 
                    ? "Melden Sie sich an, um Ihre Unterhaltungen zu sehen"
                    : "Assistent wird geladen..."
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              {/* Sidebar Toggle */}
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors focus-skillbox"
                aria-label="Sidebar umschalten"
                title="Sidebar umschalten"
              >
                {showSidebar ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
              </button>

              {/* Assistant Info */}
              {currentAssistant && (
                <>
                  <div
                    className={"w-12 h-12 rounded-full flex items-center justify-center text-xl bg-[#1e2235] text-white"}
                  >
                    {currentAssistant.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {currentAssistant.display_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedConversation ? selectedConversation.title : 'Neue Unterhaltung'}
                    </p>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* New Conversation Button */}
              <button
                onClick={safeStartNewConversation}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors focus-skillbox"
                aria-label="Neue Unterhaltung starten"
                title="Neue Unterhaltung starten"
              >
                <Plus size={20} />
              </button>

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors focus-skillbox"
                aria-label={t.chat.close}
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
                <div className="text-center mt-4">
                <button
                  onClick={safeRetryLastMessage}
                    className="mt-2 px-4 py-2 text-white rounded-md transition-opacity hover:opacity-90 text-sm"
                    style={{ backgroundColor: '#84dcc6' }}
                >
                  {t.chat.retry}
                </button>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {allMessages.length === 0 && !isTyping && (
              <div className="text-center text-gray-500 mt-8">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">
                  {selectedConversation ? 'Unterhaltung laden...' : 'Neue Unterhaltung'}
                </p>
                <p className="text-sm mt-2">
                  {currentAssistant ? `Starten Sie eine Unterhaltung mit ${currentAssistant.display_name}` : 'Wählen Sie einen Assistenten aus'}
                </p>
              </div>
            )}

            {allMessages.map((msg, index) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md space-y-2 ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  } flex flex-col`}
                >
                  {/* Message Bubble */}
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'chat-bubble-user'
                        : 'chat-bubble-ai'
                    }`}
                  >
                    {msg.isLoading ? (
                      <div className="typing-indicator">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm whitespace-pre-wrap">{
                          // Remove markdown images from content display
                          msg.content.replace(/!\[[^\]]*\]\([^)]+\)/g, '').trim()
                        }</p>
                        {msg.error && (
                          <p className="text-xs text-red-500 mt-1">{msg.error}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* File Attachments */}
                  {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                    <div className="space-y-1">
                      {msg.attachedFiles.map((file: File, fileIndex: number) => (
                        <div
                          key={fileIndex}
                          className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded"
                        >
                          📎 {file.name}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI Generated Images */}
                  {(() => {
                    // Extract images from content if not already in msg.images
                    const contentImages = msg.content.match(/!\[[^\]]*\]\(([^)]+)\)/g)?.map(match => {
                      const urlMatch = match.match(/\(([^)]+)\)/);
                      return urlMatch ? urlMatch[1] : null;
                    }).filter((url): url is string => url !== null) || [];
                    
                    const allImages = [...(msg.images || []), ...contentImages];
                    const uniqueImages = Array.from(new Set(allImages));
                    
                    return uniqueImages.length > 0 ? (
                      <ImageGallery 
                        images={uniqueImages} 
                        className="max-w-sm"
                      />
                    ) : null;
                  })()}

                  {/* Audio Links */}
                  {(() => {
                    // Extract audio links from content
                    const audioLinkMatches = msg.content.match(/\[Audio anhören\]\(([^)]+)\)/g) || [];
                    const audioUrls = audioLinkMatches.map(match => {
                      const urlMatch = match.match(/\(([^)]+)\)/);
                      return urlMatch ? urlMatch[1] : null;
                    }).filter((url): url is string => url !== null);
                    
                    return audioUrls.length > 0 ? (
                      <div className="space-y-2">
                        {audioUrls.map((audioUrl, index) => (
                          <AudioPlayer
                            key={index}
                            audioUrl={audioUrl}
                            title={`Generiertes Audio ${index + 1}`}
                            className="max-w-sm"
                          />
                        ))}
                      </div>
                    ) : null;
                  })()}

                  {/* Timestamp */}
                  <p className="text-xs opacity-70 px-2">
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && !allMessages.some(m => m.isLoading) && (
              <div className="flex justify-start">
                <div className="chat-bubble-ai">
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* File Upload Area */}
          {showFileUpload && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <FileUpload
                onFilesSelected={handleFilesSelected}
                onUpload={handleFileUpload}
                maxFiles={3}
                maxSize={25}
                language={language}
                className="max-w-none"
              />
            </div>
          )}

          {/* Chat Input Area */}
          <div className="p-4 border-t border-gray-200">
            {showFileUpload && <FileUpload onUpload={handleFileUpload} onFilesSelected={handleFilesSelected} />}
            <div className="flex items-end space-x-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={currentAssistant ? `Nachricht an ${currentAssistant.display_name}...` : t.chat.placeholder}
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[3rem] max-h-32"
                  rows={1}
                disabled={isLoading || isTyping || !isAuthenticated}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                />
              <button
                onClick={() => setShowFileUpload(!showFileUpload)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors focus-skillbox"
                aria-label={t.chat.upload}
              >
                <Upload size={20} />
              </button>
              <button
                onClick={handleSend}
                disabled={!message.trim() || isLoading || isTyping || !isAuthenticated}
                className="p-3 text-white rounded-lg disabled:opacity-50 transition-opacity hover:opacity-90 focus-skillbox"
                style={{ backgroundColor: '#84dcc6' }}
                aria-label={t.chat.send}
              >
                <Send size={20} />
              </button>
            </div>
          </div>

          {/* Error display area */}
          {error && !isLoading && (
            <div className="flex items-center justify-between p-3 mx-4 mb-2 bg-red-100 rounded-md text-red-700">
              <div className="text-sm flex-grow">{error}</div>
              <button
                onClick={safeRetryLastMessage}
                className="ml-4 px-3 py-1.5 text-white rounded-md transition-opacity hover:opacity-90 text-xs"
                style={{ backgroundColor: '#84dcc6' }}
              >
                {t.chat.retry}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatModalWithHistory; 