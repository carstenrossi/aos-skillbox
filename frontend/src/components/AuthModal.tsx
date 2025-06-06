import React, { useState } from 'react';
import { User, LogIn, UserPlus, X, Shield, Users, Crown } from 'lucide-react';
import { ApiService } from '../services/api';
import assistantOSLogo from '../assets/AssistantOS_Bildmarke_2025_Farbe_95A3B3.png';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Test-Accounts für verschiedene Rollen
  const testAccounts = [
    {
      role: 'admin',
      username: 'admin',
      password: 'admin123',
      icon: Crown,
      color: 'bg-purple-500 hover:bg-purple-600',
      label: 'Administrator',
      description: 'Vollzugriff auf alle Funktionen'
    },
    {
      role: 'manager',
      username: 'manager', 
      password: 'manager123',
      icon: Users,
      color: 'bg-blue-500 hover:bg-blue-600',
      label: 'Manager',
      description: 'Kann Skillboxes erstellen und verwalten'
    },
    {
      role: 'user',
      username: 'user',
      password: 'user123', 
      icon: User,
      color: 'bg-green-500 hover:bg-green-600',
      label: 'Benutzer',
      description: 'Grundlegende Nutzung'
    }
  ];

  const handleTestLogin = async (username: string, password: string) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await ApiService.login(username, password);
      if (response.success && response.data) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        onLoginSuccess(response.data.token, response.data.user);
        onClose();
      } else {
        setError('Login fehlgeschlagen');
      }
    } catch (error: any) {
      setError(error.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Login
        const response = await ApiService.login(formData.username, formData.password);
        if (response.success && response.data) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          onLoginSuccess(response.data.token, response.data.user);
          onClose();
        } else {
          setError('Login fehlgeschlagen');
        }
      } else {
        // Register
        if (formData.password !== formData.confirmPassword) {
          setError('Passwörter stimmen nicht überein');
          return;
        }
        
        const response = await ApiService.register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name
        });
        
        if (response.success && response.data) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          onLoginSuccess(response.data.token, response.data.user);
          onClose();
        } else {
          setError('Registrierung fehlgeschlagen');
        }
      }
    } catch (error: any) {
      setError(error.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="relative flex items-center justify-between mb-6">
          {isLogin ? (
            <>
              <div style={{ width: '28px' }}></div>

              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                 <img src={assistantOSLogo} alt="AssistantOS Logo" className="h-7 w-auto" />
              </div>
            </>
          ) : (
            <>
              <div style={{width: '28px'}}></div>

              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
                  <UserPlus className="w-5 h-5 mr-1" />
                  {'Registrieren'}
          </h2>
              </div>
            </>
          )}

          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-200 rounded-full text-gray-600 hover:text-gray-800 transition-colors"
            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Test-Accounts Section */}
        {isLogin && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Test-Accounts
            </h3>
            <div className="space-y-2">
              {testAccounts.map((account) => {
                const IconComponent = account.icon;
                return (
                  <button
                    key={account.role}
                    type="button"
                    onClick={() => handleTestLogin(account.username, account.password)}
                    disabled={loading}
                    className={`w-full text-left p-3 rounded-md text-white transition-colors disabled:opacity-50`}
                    style={{ backgroundColor: '#84dcc6' }}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className="w-5 h-5" />
                      <div>
                        <div className="font-medium">{account.label}</div>
                        <div className="text-xs opacity-90">{account.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Klicken Sie auf einen Test-Account um sich direkt anzumelden
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Benutzername
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ihr Benutzername"
            />
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ihre@email.de"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vorname
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Vorname"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nachname
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nachname"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passwort
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ihr Passwort"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passwort bestätigen
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Passwort wiederholen"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-2 px-4 rounded-md focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#84dcc6', borderColor: '#84dcc6' }}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {isLogin ? 'Anmelden' : 'Registrieren'}
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setFormData({
                username: '',
                email: '',
                password: '',
                confirmPassword: '',
                first_name: '',
                last_name: ''
              });
            }}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            {isLogin ? 'Noch kein Konto? Hier registrieren' : 'Bereits ein Konto? Hier anmelden'}
          </button>
        </div>

        {isLogin && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <strong>Admin-Test:</strong><br />
            Benutzername: <code className="bg-blue-100 px-1 rounded">admin</code><br />
            Passwort: <code className="bg-blue-100 px-1 rounded">admin123</code>
          </div>
        )}
      </div>
    </div>
  );
}; 