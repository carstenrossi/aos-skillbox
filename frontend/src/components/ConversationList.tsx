import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Plus, Trash2, Edit3, Clock } from 'lucide-react';
import { Conversation, Assistant, ApiResponse } from '../types';
import { ApiService } from '../services/api';

interface ConversationListProps {
  assistants: Assistant[];
  selectedConversationId?: string;
  onConversationSelect: (conversation: Conversation) => void;
  onNewConversation: (assistantId: string) => void;
  className?: string;
  currentAssistantId?: string;
}

interface ConversationWithAssistant extends Conversation {
  assistant?: Assistant;
}

const ConversationList: React.FC<ConversationListProps> = ({
  assistants,
  selectedConversationId,
  onConversationSelect,
  onNewConversation,
  className = '',
  currentAssistantId
}) => {
  const [conversations, setConversations] = useState<ConversationWithAssistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Load conversations on mount
  const loadConversations = useCallback(async () => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      setError(null);
      setConversations([]);
      return;
    }

    // If no current assistant, don't load anything
    if (!currentAssistantId) {
      setLoading(false);
      setConversations([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Load only conversations for the current assistant
      const response = await ApiService.getConversations(currentAssistantId);

      if (response.success && response.data) {
        // Enrich conversations with assistant data
        const enrichedConversations = response.data.map((conv: Conversation) => {
          const assistant = assistants.find(a => a.id === conv.assistant_id);
          return { ...conv, assistant };
        });

        // Sort by last message time
        const sortedConversations = enrichedConversations.sort((a: ConversationWithAssistant, b: ConversationWithAssistant) => {
          const aTime = a.last_message_at || a.created_at;
          const bTime = b.last_message_at || b.created_at;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        setConversations(sortedConversations);
      }
    } catch (err: any) {
      console.error('Failed to load conversations:', err);
      // Only show error if it's not an authentication error
      if (!err.message.includes('token') && !err.message.includes('401')) {
        setError('Fehler beim Laden der Unterhaltungen');
      }
      setConversations([]); // Clear conversations on error
    } finally {
      setLoading(false);
    }
  }, [assistants, currentAssistantId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Sie müssen angemeldet sein, um diese Aktion durchzuführen');
      return;
    }
    
    if (!window.confirm('Möchten Sie diese Unterhaltung wirklich löschen?')) {
      return;
    }

    try {
      await ApiService.deleteConversation(conversationId);
      
      // Remove from local state
      setConversations(prev => prev.filter(c => c.id !== conversationId));
    } catch (err: any) {
      console.error('Failed to delete conversation:', err);
      if (!err.message.includes('token')) {
        alert('Fehler beim Löschen der Unterhaltung');
      }
    }
  };

  const handleEditTitle = async (conversationId: string, newTitle: string) => {
    if (!newTitle.trim()) return;

    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Sie müssen angemeldet sein, um diese Aktion durchzuführen');
      return;
    }

    try {
      await ApiService.updateConversation(conversationId, { title: newTitle.trim() });
      
      // Update local state
      setConversations(prev => prev.map(c => 
        c.id === conversationId ? { ...c, title: newTitle.trim() } : c
      ));
      
      setEditingId(null);
      setEditTitle('');
    } catch (err: any) {
      console.error('Failed to update conversation title:', err);
      if (!err.message.includes('token')) {
        alert('Fehler beim Aktualisieren des Titels');
      }
    }
  };

  const startEditing = (conversation: ConversationWithAssistant, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Gestern';
    } else if (diffDays < 7) {
      return `vor ${diffDays} Tagen`;
    } else {
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    }
  };

  // Group conversations by assistant
  const groupedConversations = conversations.reduce((groups, conv) => {
    const assistantId = conv.assistant_id;
    if (!groups[assistantId]) {
      groups[assistantId] = [];
    }
    groups[assistantId].push(conv);
    return groups;
  }, {} as Record<string, ConversationWithAssistant[]>);

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-red-600 text-sm text-center">
          {error}
          <button 
            onClick={loadConversations}
            className="block mt-2 text-blue-600 hover:underline"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
          <MessageSquare size={20} className="mr-2" />
          Unterhaltungen
        </h2>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {Object.keys(groupedConversations).length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Noch keine Unterhaltungen</p>
            <p className="text-xs mt-1">Starten Sie eine neue Unterhaltung mit einem Assistenten</p>
          </div>
        ) : (
          <div className="p-2">
            {Object.entries(groupedConversations).map(([assistantId, convs]) => {
              const assistant = assistants.find(a => a.id === assistantId);
              return (
                <div key={assistantId} className="mb-4">
                  {/* Assistant Group Header with New Conversation Button */}
                  <div className="flex items-center justify-between px-2 py-1 mb-2">
                    <div className="flex items-center">
                      <div className={"w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 bg-[#1e2235] text-white"}>
                        {assistant?.icon}
                      </div>
                      <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        {assistant?.display_name || 'Unbekannt'}
                      </h4>
                    </div>
                    
                    {/* New Conversation Button */}
                    {currentAssistantId === assistantId && (
                      <button
                        onClick={() => onNewConversation(assistantId)}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        title="Neue Unterhaltung starten"
                      >
                        <Plus size={14} className="text-gray-500" />
                      </button>
                    )}
                  </div>

                  {/* Conversations in this group */}
                  <div className="space-y-1">
                    {convs.map(conversation => (
                      <div
                        key={conversation.id}
                        onClick={() => onConversationSelect(conversation)}
                        className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedConversationId === conversation.id
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {editingId === conversation.id ? (
                          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleEditTitle(conversation.id, editTitle);
                                } else if (e.key === 'Escape') {
                                  cancelEditing();
                                }
                              }}
                              className="w-full text-sm font-medium bg-white border border-gray-300 rounded px-2 py-1"
                              autoFocus
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditTitle(conversation.id, editTitle)}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Speichern
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="text-xs text-gray-600 hover:underline"
                              >
                                Abbrechen
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">
                                  {conversation.title}
                                </p>
                                <div className="flex items-center mt-1 text-xs text-gray-500">
                                  <Clock size={12} className="mr-1" />
                                  {formatTime(conversation.last_message_at || conversation.created_at)}
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => startEditing(conversation, e)}
                                  className="p-1 hover:bg-gray-200 rounded"
                                  title="Titel bearbeiten"
                                >
                                  <Edit3 size={12} />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteConversation(conversation.id, e)}
                                  className="p-1 hover:bg-red-100 text-red-600 rounded"
                                  title="Löschen"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList; 