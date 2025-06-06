import React, { useState, useEffect } from 'react';
import { User, LogOut, Crown, Users, ChevronDown, UserCog } from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { AssistantGrid } from './components/AssistantGrid';
import { Toolbox } from './components/Toolbox';
import ChatModalWithHistory from './components/ChatModalWithHistory';
import { AdminPanel } from './components/AdminPanel';
import { Assistant } from './data/assistants';
import { ApiService } from './services/api';
import assistantOSLogo from './assets/AssistantOS_Bildmarke_2025_Farbe_95A3B3.png';

function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null);
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loadingAssistants, setLoadingAssistants] = useState(true);

  useEffect(() => {
    // Load saved auth data on startup
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Load assistants from backend using ApiService
  useEffect(() => {
    const loadAssistants = async () => {
      try {
        setLoadingAssistants(true);
        // Use ApiService which uses the correct API_URL from config
        const response = await ApiService.getAssistants();
        if (response.success && response.data) {
            // Nur aktive Assistenten anzeigen
          const activeAssistants = response.data
              .filter((assistant: Assistant) => assistant.is_active === true)
              .map((assistant: Assistant) => ({
                ...assistant,
                // Mapping für Frontend-Kompatibilität
                id: assistant.id,
                name: assistant.name,
                displayName: assistant.display_name,
                description: assistant.description,
                icon: assistant.icon,
                color: 'bg-blue-500' // Default color, kann später angepasst werden
              }));
            
            setAssistants(activeAssistants);
            console.log('✅ Loaded assistants from backend:', activeAssistants.length, 'active assistants');
          } else {
          console.warn('Invalid response format from backend:', response);
          setAssistants([]);
        }
      } catch (error) {
        console.warn('Error loading assistants from backend:', error);
        setAssistants([]);
      } finally {
        setLoadingAssistants(false);
      }
    };

    loadAssistants();
  }, []);

  const handleLoginSuccess = (token: string, userData: any) => {
    console.log('🔧 Login successful, user data:', userData);
    setUser(userData);
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setShowUserMenu(false);
    setShowAdminPanel(false);
  };

  // Reload assistants function for admin panel
  const reloadAssistants = async () => {
    try {
      setLoadingAssistants(true);
      // Use ApiService which uses the correct API_URL from config
      const response = await ApiService.getAssistants();
      if (response.success && response.data) {
        const activeAssistants = response.data
            .filter((assistant: Assistant) => assistant.is_active === true)
            .map((assistant: Assistant) => ({
              ...assistant,
              id: assistant.id,
              name: assistant.name,
              displayName: assistant.display_name,
              description: assistant.description,
              icon: assistant.icon,
              color: 'bg-blue-500'
            }));
          
          setAssistants(activeAssistants);
          console.log('🔄 Assistants reloaded:', activeAssistants.length, 'active assistants');
        } else {
        console.warn('Invalid response format during reload:', response);
          setAssistants([]);
      }
    } catch (error) {
      console.warn('Error reloading assistants:', error);
    } finally {
      setLoadingAssistants(false);
    }
  };

  const getRoleInfo = (role?: string) => {
    switch (role) {
      case 'admin':
        return {
          icon: <Crown className="w-4 h-4" />,
          label: 'Administrator',
          color: 'text-purple-600 bg-purple-50 border-purple-200',
          description: 'Vollzugriff auf alle Funktionen'
        };
      case 'manager':
        return {
          icon: <Users className="w-4 h-4" />,
          label: 'Manager', 
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          description: 'Kann Skillboxes erstellen und verwalten'
        };
      default:
        return {
          icon: <User className="w-4 h-4" />,
          label: 'Benutzer',
          color: 'text-green-600 bg-green-50 border-green-200', 
          description: 'Grundlegende Nutzung'
        };
    }
  };

  // If showing admin panel, render it instead of the main app
  if (showAdminPanel && user?.role === 'admin') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f5f3f6' }}>
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowAdminPanel(false)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ← Zurück zur Hauptanwendung
                </button>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    {getRoleInfo(user.role).icon}
                    <span className="font-medium">{user.fullName || user.username}</span>
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Abmelden</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <AdminPanel 
          onAssistantChange={reloadAssistants}
          onClose={() => {
            setShowAdminPanel(false);
            reloadAssistants(); // Reload assistants when closing admin panel
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f3f6' }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ backgroundColor: '#1E2235' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">
                <span style={{ color: '#95a3b3' }}>AssistantOS</span> <span style={{ color: '#ffffff' }}>Skillbox</span>
              </h1>
            </div>

            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <img src={assistantOSLogo} alt="AssistantOS Logo" className="h-8 w-auto" />
            </div>

            <div className="flex items-center">
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: '#84dcc6' }}
                  >
                    <div className="flex items-center space-x-2">
                      {getRoleInfo(user.role).icon}
                      <span className="font-medium">{user.fullName || user.username}</span>
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      {user.role === 'admin' && (
                        <button
                          onClick={() => {
                            setShowAdminPanel(true);
                            setShowUserMenu(false);
                          }}
                            className="flex items-center space-x-2 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            <UserCog className="w-4 h-4 mr-2" />
                          <span>Admin Panel</span>
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                          className="flex items-center space-x-2 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors mt-1"
                      >
                          <LogOut className="w-4 h-4 mr-2" />
                        <span>Abmelden</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                    className="text-white px-6 py-2 rounded-lg transition-opacity font-medium hover:opacity-90"
                    style={{ backgroundColor: '#84dcc6' }}
                >
                  Anmelden
                </button>
              )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user ? (
          <>
            {loadingAssistants ? (
              <div className="text-center py-20">
                <div className="max-w-md mx-auto">
                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-gray-200">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Assistenten werden geladen...
                    </h3>
                    <p className="text-gray-600">
                      Bitte warten Sie einen Moment.
                    </p>
                  </div>
                </div>
              </div>
            ) : assistants.length === 0 ? (
              <div className="text-center py-20">
                <div className="max-w-md mx-auto">
                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Keine Assistenten verfügbar
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Derzeit sind keine aktiven Assistenten verfügbar.
                    </p>
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => setShowAdminPanel(true)}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium"
                      >
                        Assistenten verwalten
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <AssistantGrid 
                  assistants={assistants} 
                  onSelectAssistant={setSelectedAssistant}
                />
                
                {/* Trennlinie zwischen Assistenten und Tools */}
                <div className="my-12">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-6 py-2 bg-white/80 backdrop-blur-sm text-gray-500 rounded-full border border-gray-200">
                        Zusätzliche Tools & Ressourcen
                      </span>
                    </div>
                  </div>
                </div>
                
                <Toolbox userRole={user?.role} className="mt-8" />
              </>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-gray-200">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Willkommen bei Skillbox
                </h2>
                <p className="text-gray-600 mb-8">
                  Ihre KI-Assistenten-Plattform für professionelle Anwendungen. 
                  Melden Sie sich an, um Zugang zu spezialisierten Assistenten zu erhalten.
                </p>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full text-white px-6 py-3 rounded-lg transition-opacity font-medium hover:opacity-90"
                  style={{ backgroundColor: '#84dcc6' }}
                >
                  Jetzt anmelden
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
      
      {selectedAssistant && (
        <ChatModalWithHistory 
          isOpen={true}
          assistant={selectedAssistant}
          conversation={null}
          assistants={assistants}
          user={user}
          onClose={() => setSelectedAssistant(null)}
        />
      )}
    </div>
  );
}

export default App;
