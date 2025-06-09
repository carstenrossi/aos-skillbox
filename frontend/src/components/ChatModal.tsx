import React, { useState, useEffect, useRef } from 'react';
import { ChatModalProps, SupportedLanguage } from '../types';
import { X, Send, Upload, Plus } from 'lucide-react';
import { translations } from '../utils/translations';
import { useChat } from '../hooks/useChat';
import ImageGallery from './ImageGallery';
import AudioPlayer from './AudioPlayer';
import FileUpload from './FileUpload';

const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  assistant,
  conversation,
}) => {
  const [message, setMessage] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [language] = useState<SupportedLanguage>('de'); // TODO: Get from global state
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    isTyping,
    error,
    sendMessage,
    retryLastMessage,
    startNewConversation,
    uploadFiles,
  } = useChat(assistant);

  const t = translations[language];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleClose = () => {
    setMessage('');
    setShowFileUpload(false);
    onClose();
  };

  const handleSend = async () => {
    if (!message.trim() || isTyping) return;

    await sendMessage(message);
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
    await uploadFiles(files);
    setShowFileUpload(false);
  };

  const handleFilesSelected = (files: File[]) => {
    // For now, we'll just send them with the next message
    // In a full implementation, you might want to store them temporarily
    console.log('Files selected:', files);
  };

  if (!isOpen || !assistant) return null;

  const getGradientClass = (assistantName: string) => {
    switch (assistantName) {
      case 'narrative':
        return 'bg-gradient-narrative';
      case 'csrd':
        return 'bg-gradient-csrd';
      case 'adoption':
        return 'bg-gradient-adoption';
      default:
        return 'bg-gradient-skillbox';
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div 
        className="glass rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${getGradientClass(assistant.name)}`}
            >
              {assistant.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                {assistant.display_name}
              </h3>
              <p className="text-sm text-gray-500">{assistant.model_name}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* New Conversation Button */}
            <button
              onClick={startNewConversation}
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
              <button
                onClick={retryLastMessage}
                className="ml-2 text-red-600 hover:text-red-800 text-sm underline"
              >
                {t.chat.retry}
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, index) => (
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
                      <p className="text-sm whitespace-pre-wrap">
                        {msg.content.replace(/\[Audio anhören\]\([^)]+\)/g, '').trim()}
                      </p>
                      {msg.error && (
                        <p className="text-xs text-red-500 mt-1">{msg.error}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* File Attachments */}
                {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                  <div className="space-y-1">
                    {msg.attachedFiles.map((file, fileIndex) => (
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
                {msg.images && msg.images.length > 0 && (
                  <ImageGallery 
                    images={msg.images} 
                    className="max-w-sm"
                  />
                )}

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
          {isTyping && !messages.some(m => m.isLoading) && (
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

        {/* Input */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-end space-x-3">
            <button
              onClick={() => setShowFileUpload(!showFileUpload)}
              className={`p-3 rounded-full transition-colors focus-skillbox ${
                showFileUpload 
                  ? 'bg-skillbox-purple text-white' 
                  : 'hover:bg-gray-100'
              }`}
              aria-label={t.chat.upload}
            >
              <Upload size={20} />
            </button>
            
            <div className="flex-1">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t.chat.placeholder}
                className="input-skillbox resize-none min-h-[3rem] max-h-32"
                rows={1}
                disabled={isTyping || isLoading}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
              />
            </div>
            
            <button
              onClick={handleSend}
              disabled={!message.trim() || isTyping || isLoading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isTyping || isLoading ? (
                <div className="spinner text-white" />
              ) : (
                <>
                  <Send size={18} />
                  <span className="ml-2 hidden sm:inline">{t.chat.send}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal; 