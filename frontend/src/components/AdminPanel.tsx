import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Settings, 
  BarChart3, 
  Shield, 
  Server,
  UserPlus,
  Edit,
  Trash2,
  Crown,
  CheckCircle,
  XCircle,
  Activity,
  Bot,
  Plus,
  Save,
  X,
  Wrench
} from 'lucide-react';
import { ApiService } from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'manager' | 'admin';
  created_at: string;
  last_login?: string;
  is_active: boolean;
}

interface Assistant {
  id: string;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  api_url: string;
  jwt_token?: string;
  model_name: string;
  system_prompt: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Tool {
  id: number;
  name: string;
  description: string;
  url: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  is_external: boolean;
  created_at?: string;
  updated_at?: string;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalConversations: number;
  systemUptime: string;
  apiCalls: number;
  apiCalls24h: number;
  avgResponseTime: number;
  systemLoad: number;
  memoryUsage: number;
}

// Mock data for users
const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@skillbox.com',
    role: 'admin',
    created_at: '2024-01-15T10:30:00Z',
    last_login: '2024-01-20T14:45:00Z',
    is_active: true
  },
  {
    id: '2',
    username: 'manager',
    email: 'manager@skillbox.com',
    role: 'manager',
    created_at: '2024-01-16T09:15:00Z',
    last_login: '2024-01-20T13:20:00Z',
    is_active: true
  },
  {
    id: '3',
    username: 'user123',
    email: 'user@example.com',
    role: 'user',
    created_at: '2024-01-17T16:22:00Z',
    last_login: '2024-01-19T11:10:00Z',
    is_active: true
  },
  {
    id: '4',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    created_at: '2024-01-18T12:45:00Z',
    is_active: false
  }
];

// Mock data for assistants
const mockAssistants: Assistant[] = [
  {
    id: '1',
    name: 'narrative',
    display_name: 'Narrative Coach',
    description: 'Ein spezialisierter Assistent für Storytelling, Kommunikation und narrative Entwicklung.',
    icon: '📖',
    api_url: 'https://kr.assistantos.de',
    jwt_token: 'abc123',
    model_name: 'narrative-coach',
    system_prompt: 'Du bist ein Narrative Assistant, der bei Storytelling, Kommunikation und narrativer Entwicklung hilft.',
    is_active: true,
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    name: 'csrd',
    display_name: 'CSRD Coach',
    description: 'Experte für Corporate Sustainability Reporting Directive und Nachhaltigkeitsberichterstattung.',
    icon: '🌱',
    api_url: 'https://kr.assistantos.de',
    jwt_token: 'def456',
    model_name: 'csrd-coach',
    system_prompt: 'Du bist ein CSRD-Experte und hilfst bei der Corporate Sustainability Reporting Directive.',
    is_active: true,
    created_at: '2024-01-11T09:00:00Z',
    updated_at: '2024-01-16T14:20:00Z'
  },
  {
    id: '3',
    name: 'adoption',
    display_name: 'Adoption Coach',
    description: 'Unterstützt bei Adoptionsprozessen und Change Management in Organisationen.',
    icon: '🚀',
    api_url: 'https://kr.assistantos.de',
    jwt_token: 'ghi789',
    model_name: 'adoption-coach',
    system_prompt: 'Du bist ein Adoption Coach, der bei Veränderungsprozessen und der Einführung neuer Systeme hilft.',
    is_active: true,
    created_at: '2024-01-12T10:00:00Z',
    updated_at: '2024-01-17T16:45:00Z'
  },
  {
    id: '4',
    name: 'image',
    display_name: 'Image Generator',
    description: 'Erstellt kreative Bilder und visuelle Inhalte basierend auf Textbeschreibungen.',
    icon: '🎨',
    api_url: 'https://kr.assistantos.de',
    jwt_token: 'jkl012',
    model_name: 'image',
    system_prompt: 'Du bist ein kreativer Image Generator, der Bilder basierend auf Beschreibungen erstellt.',
    is_active: false,
    created_at: '2024-01-13T11:00:00Z',
    updated_at: '2024-01-18T09:15:00Z'
  }
];

const mockStats: SystemStats = {
  totalUsers: 3,
  activeUsers: 2,
  totalConversations: 15,
  systemUptime: '2d 4h 15m',
  apiCalls: 1205,
  apiCalls24h: 12547,
  avgResponseTime: 1.2,
  systemLoad: 68,
  memoryUsage: 74
};

interface AdminPanelProps {
  onAssistantChange?: () => Promise<void>;
  onClose?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onAssistantChange, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAssistantModal, setShowAssistantModal] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showToolModal, setShowToolModal] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Load data from backend instead of using static mock data
    const loadData = async () => {
      try {
        // Lade echte Assistenten-Daten vom Backend über ApiService
        const assistantsResponse = await ApiService.getAssistants();
        if (assistantsResponse.success && assistantsResponse.data) {
          setAssistants(assistantsResponse.data as Assistant[]);
          console.log('🔧 Admin: Loaded assistants from backend:', assistantsResponse.data.length);
          } else {
          console.warn('Admin: Invalid response format from backend:', assistantsResponse);
          setAssistants(mockAssistants);
        }

        // Lade Tools-Daten vom Backend
        try {
          const toolsResponse = await ApiService.getTools();
          if (toolsResponse.success && Array.isArray(toolsResponse.data)) {
            setTools(toolsResponse.data);
            console.log('🔧 Admin: Loaded tools from backend:', toolsResponse.data.length);
        } else {
            console.warn('Admin: Invalid response format from backend:', toolsResponse);
          }
        } catch (toolsError) {
          console.warn('Admin: Error loading tools:', toolsError);
        }

        // Lade echte Benutzer-Daten vom Backend
        if (user?.role === 'admin') {
          try {
            const usersResponse = await ApiService.getUsers();
            if (usersResponse.success && Array.isArray(usersResponse.data)) {
              setUsers(usersResponse.data);
              console.log('🔧 Admin: Loaded users from backend:', usersResponse.data.length);
            } else {
              console.warn('Admin: Failed to load users from backend - invalid response format');
            }
          } catch (error) {
            console.error('Admin: Error loading users:', error);
          }
        }

      } catch (error) {
        console.error('Admin: Error loading data:', error);
        setAssistants(mockAssistants);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.role]);

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Sind Sie sicher, dass Sie diesen Benutzer löschen möchten?')) {
      try {
        await ApiService.deleteUser(userId);
          setUsers(prev => prev.filter(user => user.id !== userId));
          console.log('✅ User deleted successfully');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Fehler beim Löschen des Benutzers. Bitte versuchen Sie es erneut.');
      }
    }
  };

  const handleDeleteAssistant = async (assistantId: string) => {
    if (window.confirm('Sind Sie sicher, dass Sie diesen Assistenten löschen möchten?')) {
      try {
        await ApiService.deleteAssistant(assistantId);
          setAssistants(prev => prev.filter(assistant => assistant.id !== assistantId));
          console.log('✅ Assistant deleted successfully');
          
          // Notify parent component about assistant changes
          if (onAssistantChange) {
            await onAssistantChange();
        }
      } catch (error) {
        console.error('Error deleting assistant:', error);
        alert('Fehler beim Löschen des Assistenten. Bitte versuchen Sie es erneut.');
      }
    }
  };

  const handleEditAssistant = (assistant: Assistant) => {
    setEditingAssistant(assistant);
    setShowAssistantModal(true);
  };

  const handleSaveAssistant = async (assistantData: Partial<Assistant>) => {
    try {
      if (editingAssistant) {
        // Update existing assistant
        const response = await ApiService.updateAssistant(editingAssistant.id, assistantData);
        if (response.success && response.data) {
          setAssistants(prev => prev.map(a => 
            a.id === editingAssistant.id ? { ...response.data, jwt_token: a.jwt_token } : a
          ));
          console.log('✅ Assistant updated successfully');
        } else {
          alert('Fehler beim Aktualisieren des Assistenten. Bitte versuchen Sie es erneut.');
          return;
        }
      } else {
        // Create new assistant
        const response = await ApiService.createAssistant(assistantData);
        if (response.success && response.data) {
          setAssistants(prev => [...prev, response.data]);
          console.log('✅ Assistant created successfully');
        } else {
          alert('Fehler beim Erstellen des Assistenten. Bitte versuchen Sie es erneut.');
          return;
        }
      }
    } catch (error) {
      console.error('Error saving assistant:', error);
      alert('Fehler beim Speichern des Assistenten. Bitte versuchen Sie es erneut.');
      return;
    }

    setShowAssistantModal(false);
    setEditingAssistant(null);
    
    // Notify parent component about assistant changes
    if (onAssistantChange) {
      await onAssistantChange();
    }
  };

  const toggleAssistantStatus = async (assistantId: string) => {
    try {
      // Finde den aktuellen Assistant
      const currentAssistant = assistants.find(a => a.id === assistantId);
      if (!currentAssistant) return;

      console.log(`🔧 Toggling assistant ${currentAssistant.display_name} from ${currentAssistant.is_active} to ${!currentAssistant.is_active}`);

      // API-Call um Status zu ändern
      const response = await ApiService.updateAssistant(assistantId, {
          is_active: !currentAssistant.is_active
      });

      if (response.success && response.data) {
        console.log(`✅ Backend response:`, response.data);
        
        // Lokalen State mit der Backend-Antwort aktualisieren
        setAssistants(prev => prev.map(assistant => 
          assistant.id === assistantId 
            ? { ...response.data, jwt_token: assistant.jwt_token } // JWT Token aus Sicherheitsgründen beibehalten
            : assistant
        ));
        
        console.log(`🔧 Assistant ${currentAssistant.display_name} status changed to: ${response.data.is_active}`);
        
        // Notify parent component about assistant changes
        if (onAssistantChange) {
          await onAssistantChange();
        }
      } else {
        console.error('Failed to update assistant status:', response);
        alert('Fehler beim Aktualisieren des Assistant-Status. Bitte versuchen Sie es erneut.');
      }
    } catch (error) {
      console.error('Error updating assistant status:', error);
      alert('Fehler beim Aktualisieren des Assistant-Status. Bitte versuchen Sie es erneut.');
    }
  };

  const handleChangeUserRole = async (userId: string, newRole: 'user' | 'manager' | 'admin') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        ));
        console.log('✅ User role updated successfully');
      } else {
        console.error('Failed to update user role');
        alert('Fehler beim Aktualisieren der Benutzerrolle. Bitte versuchen Sie es erneut.');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Fehler beim Aktualisieren der Benutzerrolle. Bitte versuchen Sie es erneut.');
    }
  };

  const handleCreateUser = async (userData: { username: string; email: string; password: string; role: 'user' | 'manager' | 'admin' }) => {
    try {
      const response = await ApiService.createUser(userData);
      if (response.success && response.data?.user) {
        setUsers(prev => [...prev, response.data!.user]);
        console.log('✅ User created successfully');
        setShowUserModal(false);
      } else {
        console.error('Failed to create user - invalid response format');
        alert('Fehler beim Erstellen des Benutzers. Bitte versuchen Sie es erneut.');
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      const errorMessage = error?.details?.message || error?.message || 'Unbekannter Fehler';
      alert(`Fehler beim Erstellen des Benutzers: ${errorMessage}`);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4 text-purple-500" />;
      case 'manager': return <Users className="w-4 h-4 text-blue-500" />;
      default: return <Users className="w-4 h-4 text-green-500" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800 border-purple-200',
      manager: 'bg-blue-100 text-blue-800 border-blue-200',
      user: 'bg-green-100 text-green-800 border-green-200'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colors[role as keyof typeof colors]}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  // Tool handlers
  const handleCreateTool = async (toolData: Partial<Tool>) => {
    try {
      const response = await ApiService.createTool(toolData);
      if (response.success && response.data) {
        setTools(prev => [...prev, response.data]);
        console.log('✅ Tool created successfully');
      } else {
        console.error('Failed to create tool');
        alert('Fehler beim Erstellen des Tools. Bitte versuchen Sie es erneut.');
      }
    } catch (error) {
      console.error('Error creating tool:', error);
      alert('Fehler beim Erstellen des Tools. Bitte versuchen Sie es erneut.');
    }

    setShowToolModal(false);
    setEditingTool(null);
  };

  const handleUpdateTool = async (toolData: Partial<Tool>) => {
    if (!editingTool) return;

    try {
      const response = await ApiService.updateTool(editingTool.id, toolData);
      if (response.success && response.data) {
        setTools(prev => prev.map(t => 
          t.id === editingTool.id ? response.data : t
        ));
        console.log('✅ Tool updated successfully');
      } else {
        console.error('Failed to update tool');
        alert('Fehler beim Aktualisieren des Tools. Bitte versuchen Sie es erneut.');
      }
    } catch (error) {
      console.error('Error updating tool:', error);
      alert('Fehler beim Aktualisieren des Tools. Bitte versuchen Sie es erneut.');
    }

    setShowToolModal(false);
    setEditingTool(null);
  };

  const handleDeleteTool = async (toolId: number) => {
    if (window.confirm('Sind Sie sicher, dass Sie dieses Tool löschen möchten?')) {
      try {
        const response = await ApiService.deleteTool(toolId);
        if (response.success) {
          setTools(prev => prev.filter(tool => tool.id !== toolId));
          console.log('✅ Tool deleted successfully');
        } else {
          console.error('Failed to delete tool');
          alert('Fehler beim Löschen des Tools. Bitte versuchen Sie es erneut.');
        }
      } catch (error) {
        console.error('Error deleting tool:', error);
        alert('Fehler beim Löschen des Tools. Bitte versuchen Sie es erneut.');
      }
    }
  };

  const handleSaveTool = (toolData: Partial<Tool>) => {
    if (editingTool) {
      handleUpdateTool(toolData);
    } else {
      handleCreateTool(toolData);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-2 text-gray-600">Lade Admin-Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Shield className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        </div>
        <p className="text-gray-600">Systemverwaltung und Benutzermanagement</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Benutzer Gesamt</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Aktive Benutzer</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.activeUsers || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Gespräche</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalConversations || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Server className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">System Uptime</p>
              <p className="text-lg font-bold text-gray-900">{stats?.systemUptime || 'Nicht verfügbar'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'users', label: 'Benutzerverwaltung', icon: Users },
            { id: 'assistants', label: 'Assistenten', icon: Bot },
            { id: 'tools', label: 'Tools', icon: Wrench },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'system', label: 'System Status', icon: Server },
            { id: 'settings', label: 'Einstellungen', icon: Settings }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Benutzerverwaltung</h2>
              <button 
                onClick={() => setShowUserModal(true)}
                className="text-white font-medium py-2 px-4 rounded-lg flex items-center shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                style={{ backgroundColor: '#84dcc6' }}
              >
                <UserPlus size={18} className="mr-2" />
                Neuen Benutzer erstellen
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Benutzer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rolle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Erstellt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Letzter Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getRoleIcon(user.role)}
                        {getRoleBadge(user.role)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString('de-DE') : 'Nie'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <select
                          value={user.role}
                          onChange={(e) => handleChangeUserRole(user.id, e.target.value as 'user' | 'manager' | 'admin')}
                          className="text-xs border rounded px-2 py-1"
                        >
                          <option value="user">User</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'assistants' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-700">Assistenten</h3>
            <button
              onClick={() => { setEditingAssistant(null); setShowAssistantModal(true); }}
              className="text-white font-medium py-2 px-4 rounded-lg flex items-center shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              style={{ backgroundColor: '#84dcc6' }}
            >
              <Plus size={18} className="mr-2" />
              Neuer Assistent
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Assistent</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Modell</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Erstellt</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {assistants.map((assistant) => (
                    <tr key={assistant.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{assistant.icon}</span>
                          <div>
                            <div className="font-medium text-gray-900">{assistant.display_name}</div>
                            <div className="text-sm text-gray-500">{assistant.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {assistant.model_name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleAssistantStatus(assistant.id)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            assistant.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          } transition-colors`}
                        >
                          {assistant.is_active ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Aktiv
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              Inaktiv
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(assistant.created_at).toLocaleDateString('de-DE')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditAssistant(assistant)}
                            className="p-1 text-gray-600 hover:text-indigo-600 transition-colors"
                            title="Bearbeiten"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAssistant(assistant.id)}
                            className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tools' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-700">Toolbox verwalten</h2>
            <button
              onClick={() => { setEditingTool(null); setShowToolModal(true); }}
              className="text-white font-medium py-2 px-4 rounded-lg flex items-center shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              style={{ backgroundColor: '#84dcc6' }}
            >
              <Plus size={18} className="mr-2" />
              Neues Tool erstellen
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {tools.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Wrench size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Keine Tools vorhanden</p>
                  <p className="text-sm">Fügen Sie externe Tools hinzu, die in der Toolbox angezeigt werden sollen.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {tools.map((tool) => (
                    <div
                      key={tool.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">
                            {tool.icon === 'FileText' && '📄'}
                            {tool.icon === 'Database' && '🗄️'}
                            {tool.icon === 'Calculator' && '🧮'}
                            {tool.icon === 'Globe' && '🌐'}
                            {tool.icon === 'Settings' && '⚙️'}
                            {tool.icon === 'Code' && '💻'}
                            {tool.icon === 'Wrench' && '🔧'}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{tool.name}</h3>
                            <p className="text-sm text-gray-600">{tool.description}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-xs text-gray-500">
                                Reihenfolge: {tool.sort_order}
                              </span>
                              <a
                                href={tool.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-700"
                              >
                                {tool.url}
                              </a>
                              {tool.is_external && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                  Extern
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-2">
                            {tool.is_active ? (
                              <CheckCircle size={20} className="text-green-500" />
                            ) : (
                              <XCircle size={20} className="text-red-500" />
                            )}
                            <span className="text-sm text-gray-600">
                              {tool.is_active ? 'Aktiv' : 'Inaktiv'}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setEditingTool(tool);
                              setShowToolModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTool(tool.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tools.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Tool-Management Hinweise</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Tools werden nach der Reihenfolge (sort_order) sortiert angezeigt</li>
                    <li>• Nur aktive Tools erscheinen in der öffentlichen Toolbox</li>
                    <li>• Externe Tools öffnen sich in einem neuen Tab</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Analytics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">API Aufrufe (24h)</h3>
              <p className="text-2xl font-bold text-blue-600">{stats?.apiCalls24h || 0}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Durchschnittliche Antwortzeit</h3>
              <p className="text-2xl font-bold text-green-600">{stats?.avgResponseTime?.toFixed(2) || 'Nicht verfügbar'}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium">Backend Server</span>
              </div>
              <span className="text-green-600 font-medium">Online</span>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium">AssistantOS API</span>
              </div>
              <span className="text-green-600 font-medium">Verbunden</span>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium">Authentifizierung</span>
              </div>
              <span className="text-green-600 font-medium">Aktiv</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Einstellungen</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximale API-Aufrufe pro Minute
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                defaultValue="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Timeout (Minuten)
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                defaultValue="15"
              />
            </div>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              Einstellungen speichern
            </button>
          </div>
        </div>
      )}

      {/* Assistant Modal */}
      {showAssistantModal && (
        <AssistantModal
          assistant={editingAssistant}
          isEditing={!!editingAssistant}
          onSave={handleSaveAssistant}
          onClose={() => {
            setShowAssistantModal(false);
            setEditingAssistant(null);
          }}
        />
      )}

      {/* User Modal */}
      {showUserModal && (
        <UserModal
          onSave={handleCreateUser}
          onClose={() => setShowUserModal(false)}
        />
      )}

      {/* Tool Modal */}
      {showToolModal && (
        <ToolModal
          tool={editingTool}
          isEditing={!!editingTool}
          onSave={handleSaveTool}
          onClose={() => {
            setEditingTool(null);
            setShowToolModal(false);
          }}
        />
      )}
    </div>
  );
};

// Assistant Modal Component
interface AssistantModalProps {
  assistant: Assistant | null;
  isEditing: boolean;
  onSave: (assistant: Partial<Assistant>) => void;
  onClose: () => void;
}

const AssistantModal: React.FC<AssistantModalProps> = ({ 
  assistant, 
  isEditing, 
  onSave, 
  onClose 
}) => {
  const [formData, setFormData] = useState<Partial<Assistant>>(
    assistant || {
      name: '',
      display_name: '',
      description: '',
      icon: '🤖',
      api_url: 'https://kr.assistantos.de',
      jwt_token: '',
      model_name: '',
      system_prompt: '',
      is_active: true
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Assistent bearbeiten' : 'Neuer Assistent'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name (Technisch)
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="z.B. narrative"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={formData.display_name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="z.B. Narrative Coach"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Beschreibung
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Beschreibung des Assistenten..."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon (Emoji)
              </label>
              <input
                type="text"
                value={formData.icon || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="🤖"
                maxLength={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modell Name
              </label>
              <input
                type="text"
                value={formData.model_name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, model_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="z.B. narrative-coach"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API URL
            </label>
            <input
              type="url"
              value={formData.api_url || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, api_url: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="https://kr.assistantos.de"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              JWT Token
            </label>
            <input
              type="password"
              value={formData.jwt_token || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, jwt_token: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ihr JWT Token für diese API"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Dieser Token wird sicher auf dem Server gespeichert und nicht im Browser angezeigt.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              System Prompt
            </label>
            <textarea
              value={formData.system_prompt || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="System Prompt für den Assistenten..."
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active || false}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
              Assistent aktiv
            </label>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              style={{ backgroundColor: '#84dcc6' }}
            >
              {isEditing ? 'Änderungen speichern' : 'Assistent erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// User Modal Component
interface UserModalProps {
  onSave: (userData: { username: string; email: string; password: string; role: 'user' | 'manager' | 'admin' }) => void;
  onClose: () => void;
}

const UserModal: React.FC<UserModalProps> = ({ onSave, onClose }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user' as 'user' | 'manager' | 'admin'
  });

  const [passwordStrength, setPasswordStrength] = useState<{
    hasMinLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    noCommonPassword: boolean;
    strength: 'weak' | 'medium' | 'strong' | 'very_strong';
  }>({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
    noCommonPassword: true,
    strength: 'weak'
  });

  const validatePassword = (password: string) => {
    const commonPasswords = [
      'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
      'password1', '12345678', '123123', '1234567890', 'qwerty123',
      'admin', 'administrator', 'root', 'user', 'guest', 'demo', 'test',
      'welcome', 'login', 'pass', 'master', 'secret', 'letmein',
      'monkey', 'dragon', 'football', 'baseball', 'basketball',
      'superman', 'batman', 'princess', 'sunshine', 'iloveyou',
      'trustno1', 'hello', 'welcome1', 'password2', 'welcome123'
    ];
    
    const forbiddenPatterns = [
      'password', 'passwort', '123456', 'qwerty', 'admin', 'user',
      'skillbox', 'test', 'demo', 'guest', 'root'
    ];
    
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
    
    // Check common passwords
    const lowerPassword = password.toLowerCase();
    const noCommonPassword = !commonPasswords.includes(lowerPassword);
    
    // Check forbidden patterns
    const noForbiddenPatterns = !forbiddenPatterns.some(pattern => 
      lowerPassword.includes(pattern.toLowerCase())
    );
    
    // Check sequential characters (123, abc, qwerty, etc.)
    const hasSequentialChars = /(?:012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|qwe|wer|ert|rty|tyu|yui|uio|iop|asd|sdf|dfg|fgh|ghj|hjk|jkl|zxc|xcv|cvb|vbn|bnm)/i.test(password);
    const noSequentialChars = !hasSequentialChars;
    
    // Check repeating characters (more than 3 in a row)
    const repeatingChars = /(.)\1{3,}/.test(password);
    const noExcessiveRepeating = !repeatingChars;
    
    // All additional security checks must pass
    const allSecurityChecksPass = noCommonPassword &&
                                 noForbiddenPatterns &&
                                 noSequentialChars &&
                                 noExcessiveRepeating;

    let score = 0;
    if (hasMinLength) score += 20;
    if (hasUppercase) score += 20;
    if (hasLowercase) score += 15;
    if (hasNumber) score += 20;
    if (hasSpecialChar) score += 25;
    if (allSecurityChecksPass) score += 10;

    let strength: 'weak' | 'medium' | 'strong' | 'very_strong';
    if (score < 40) strength = 'weak';
    else if (score < 70) strength = 'medium';
    else if (score < 90) strength = 'strong';
    else strength = 'very_strong';

    setPasswordStrength({
      hasMinLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecialChar,
      noCommonPassword: allSecurityChecksPass, // Now correctly shows if ALL security checks pass
      strength
    });
  };

  const handlePasswordChange = (password: string) => {
    setFormData(prev => ({ ...prev, password }));
    validatePassword(password);
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'weak': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-orange-600 bg-orange-100';
      case 'strong': return 'text-blue-600 bg-blue-100';
      case 'very_strong': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStrengthText = (strength: string) => {
    switch (strength) {
      case 'weak': return 'Schwach';
      case 'medium': return 'Mittel';
      case 'strong': return 'Stark';
      case 'very_strong': return 'Sehr stark';
      default: return 'Unbekannt';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as any);
  };

  const isPasswordValid = passwordStrength.hasMinLength && 
                          passwordStrength.hasUppercase && 
                          passwordStrength.hasLowercase && 
                          passwordStrength.hasNumber && 
                          passwordStrength.hasSpecialChar && 
                          passwordStrength.noCommonPassword; // This now represents ALL backend checks

  const isFormValid = formData.username && formData.email && formData.password && isPasswordValid;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Neuer Benutzer
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Benutzername
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Benutzername eingeben"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-Mail-Adresse
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="E-Mail-Adresse eingeben"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Passwort
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Sicheres Passwort erstellen"
              required
              minLength={8}
            />
            {formData.password && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-700">Passwort-Stärke:</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStrengthColor(passwordStrength.strength)}`}>
                    {getStrengthText(passwordStrength.strength)}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className={`flex items-center ${passwordStrength.hasMinLength ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordStrength.hasMinLength ? (
                      <CheckCircle className="w-3 h-3 mr-2" />
                    ) : (
                      <XCircle className="w-3 h-3 mr-2" />
                    )}
                    Mindestens 8 Zeichen lang
                  </div>
                  <div className={`flex items-center ${passwordStrength.hasUppercase ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordStrength.hasUppercase ? (
                      <CheckCircle className="w-3 h-3 mr-2" />
                    ) : (
                      <XCircle className="w-3 h-3 mr-2" />
                    )}
                    Mindestens ein Großbuchstabe (A-Z)
                  </div>
                  <div className={`flex items-center ${passwordStrength.hasLowercase ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordStrength.hasLowercase ? (
                      <CheckCircle className="w-3 h-3 mr-2" />
                    ) : (
                      <XCircle className="w-3 h-3 mr-2" />
                    )}
                    Mindestens ein Kleinbuchstabe (a-z)
                  </div>
                  <div className={`flex items-center ${passwordStrength.hasNumber ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordStrength.hasNumber ? (
                      <CheckCircle className="w-3 h-3 mr-2" />
                    ) : (
                      <XCircle className="w-3 h-3 mr-2" />
                    )}
                    Mindestens eine Zahl (0-9)
                  </div>
                  <div className={`flex items-center ${passwordStrength.hasSpecialChar ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordStrength.hasSpecialChar ? (
                      <CheckCircle className="w-3 h-3 mr-2" />
                    ) : (
                      <XCircle className="w-3 h-3 mr-2" />
                    )}
                    Mindestens ein Sonderzeichen (!@#$%^&*)
                  </div>
                  <div className={`flex items-center ${passwordStrength.noCommonPassword ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordStrength.noCommonPassword ? (
                      <CheckCircle className="w-3 h-3 mr-2" />
                    ) : (
                      <XCircle className="w-3 h-3 mr-2" />
                    )}
                    Erfüllt alle Sicherheitsrichtlinien
                  </div>
                </div>
              </div>
            )}
            {!formData.password && (
              <div className="mt-2 text-xs text-gray-500">
                <p className="font-medium mb-1">Passwort-Anforderungen:</p>
                <ul className="space-y-0.5">
                  <li>• Mindestens 8 Zeichen lang</li>
                  <li>• Mindestens ein Großbuchstabe (A-Z)</li>
                  <li>• Mindestens ein Kleinbuchstabe (a-z)</li>
                  <li>• Mindestens eine Zahl (0-9)</li>
                  <li>• Mindestens ein Sonderzeichen (!@#$%^&*)</li>
                  <li>• Keine häufigen/unsicheren Passwörter</li>
                  <li>• Keine Sequenzen (123, abc, qwerty)</li>
                  <li>• Keine übermäßigen Wiederholungen</li>
                </ul>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rolle
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'user' | 'manager' | 'admin' }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="user">User</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="mt-8 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center gap-2"
              style={{ backgroundColor: '#84dcc6' }}
              disabled={!isFormValid}
            >
              <UserPlus className="w-4 h-4" />
              Erstellen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Tool Modal Component
interface ToolModalProps {
  tool: Tool | null;
  isEditing: boolean;
  onSave: (tool: Partial<Tool>) => void;
  onClose: () => void;
}

const ToolModal: React.FC<ToolModalProps> = ({ 
  tool, 
  isEditing, 
  onSave, 
  onClose 
}) => {
  const [formData, setFormData] = useState<Partial<Tool>>({
    name: tool?.name || '',
    description: tool?.description || '',
    url: tool?.url || '',
    icon: tool?.icon || '🔧',
    sort_order: tool?.sort_order || 1,
    is_active: tool?.is_active ?? true,
    is_external: tool?.is_external ?? true
  });

  useEffect(() => {
    if (tool) {
      setFormData({
        name: tool.name || '',
        description: tool.description || '',
        url: tool.url || '',
        icon: tool.icon || '🔧',
        sort_order: tool.sort_order || 1,
        is_active: tool.is_active ?? true,
        is_external: tool.is_external ?? true
      });
    }
  }, [tool]);

  const isFormValid = formData.name && formData.description && formData.url && formData.icon;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid) {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4">{isEditing ? 'Tool bearbeiten' : 'Neues Tool erstellen'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tool Name *
            </label>
            <input 
              type="text" 
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Tool-Name eingeben"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Beschreibung *
            </label>
            <textarea 
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Tool-Beschreibung eingeben"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL *
            </label>
            <input 
              type="url" 
              value={formData.url || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="https://example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon *
            </label>
            <input 
              type="text" 
              value={formData.icon || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="🔧 (Emoji oder Icon-Klasse)"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sortierreihenfolge
            </label>
            <input 
              type="number" 
              value={formData.sort_order || 1}
              onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 1 }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              min="1"
            />
          </div>

          <div className="flex items-center space-x-6">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                checked={formData.is_active || false}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Aktiv</span>
            </label>

            <label className="flex items-center">
              <input 
                type="checkbox" 
                checked={formData.is_external || false}
                onChange={(e) => setFormData(prev => ({ ...prev, is_external: e.target.checked }))}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Externer Link</span>
            </label>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center gap-2"
              style={{ backgroundColor: '#84dcc6' }}
              disabled={!isFormValid}
            >
              <Save className="w-4 h-4" />
              {isEditing ? 'Änderungen speichern' : 'Tool erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 