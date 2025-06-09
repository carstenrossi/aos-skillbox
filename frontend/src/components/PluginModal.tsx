import React, { useState, useEffect } from 'react';
import { Save, FileText, X } from 'lucide-react';
import { Plugin } from '../types';

interface PluginModalProps {
  plugin: Plugin | null;
  isEditing: boolean;
  onSave: (plugin: Partial<Plugin>) => void;
  onClose: () => void;
}

export const PluginModal: React.FC<PluginModalProps> = ({ 
  plugin, 
  isEditing, 
  onSave, 
  onClose 
}) => {
  const [formData, setFormData] = useState<Partial<Plugin>>({
    name: plugin?.name || '',
    display_name: plugin?.display_name || '',
    description: plugin?.description || '',
    version: plugin?.version || '1.0.0',
    author: plugin?.author || '',
    plugin_type: plugin?.plugin_type || 'utility',
    runtime_type: plugin?.runtime_type || 'api_call',
    is_active: plugin?.is_active ?? true,
    is_public: plugin?.is_public ?? true,
    manifest: plugin?.manifest || {
      name: '',
      display_name: '',
      description: '',
      version: '1.0.0',
      author: '',
      plugin_type: 'utility',
      runtime_type: 'api_call',
      functions: []
    }
  });

  const [showJsonImport, setShowJsonImport] = useState(false);
  const [jsonImportText, setJsonImportText] = useState('');
  const [jsonError, setJsonError] = useState('');

  useEffect(() => {
    if (plugin) {
      setFormData({
        name: plugin.name || '',
        display_name: plugin.display_name || '',
        description: plugin.description || '',
        version: plugin.version || '1.0.0',
        author: plugin.author || '',
        plugin_type: plugin.plugin_type || 'utility',
        runtime_type: plugin.runtime_type || 'api_call',
        is_active: plugin.is_active ?? true,
        is_public: plugin.is_public ?? true,
        manifest: plugin.manifest || {
          name: plugin.name || '',
          display_name: plugin.display_name || '',
          description: plugin.description || '',
          version: plugin.version || '1.0.0',
          author: plugin.author || '',
          plugin_type: plugin.plugin_type || 'utility',
          runtime_type: plugin.runtime_type || 'api_call',
          functions: []
        }
      });
    }
  }, [plugin]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);

  const handleJsonImport = () => {
    try {
      setJsonError('');
      const jsonData = JSON.parse(jsonImportText);
      
      // Validate required fields
      if (!jsonData.name || !jsonData.display_name || !jsonData.description) {
        setJsonError('JSON muss mindestens name, display_name und description enthalten');
        return;
      }

      // Update form data with JSON data
      setFormData({
        name: jsonData.name,
        display_name: jsonData.display_name,
        description: jsonData.description,
        version: jsonData.version || '1.0.0',
        author: jsonData.author || '',
        plugin_type: jsonData.plugin_type || 'utility',
        runtime_type: jsonData.runtime_type || 'api_call',
        is_active: jsonData.is_active ?? true,
        is_public: jsonData.is_public ?? true,
        manifest: jsonData.manifest || jsonData, // Use entire JSON as manifest if manifest not specified
        config_schema: jsonData.config_schema || {}
      });

      setShowJsonImport(false);
      setJsonImportText('');
    } catch (error) {
      setJsonError('Ungültiges JSON Format');
    }
  };

  const isFormValid = formData.name && formData.display_name && formData.description && formData.author;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid) {
      // Update manifest with form data
      const updatedManifest = {
        ...formData.manifest!,
        name: formData.name!,
        display_name: formData.display_name!,
        description: formData.description!,
        version: formData.version!,
        author: formData.author!,
        plugin_type: formData.plugin_type!,
        runtime_type: formData.runtime_type!
      };
      
      onSave({
        ...formData,
        manifest: updatedManifest
      });
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div 
        className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">{isEditing ? 'Plugin bearbeiten' : 'Neues Plugin erstellen'}</h3>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={() => setShowJsonImport(!showJsonImport)}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors flex items-center gap-1"
              >
                <FileText size={16} />
                {showJsonImport ? 'Formular' : 'JSON Import'}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {showJsonImport ? (
          // JSON Import Mode
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plugin JSON einfügen
              </label>
              <textarea
                value={jsonImportText}
                onChange={(e) => setJsonImportText(e.target.value)}
                className="w-full h-96 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                placeholder={`Beispiel Plugin JSON einfügen:

{
  "name": "elevenlabs_tts",
  "display_name": "ElevenLabs Text-to-Speech",
  "description": "Convert text to speech using ElevenLabs AI voices",
  "version": "1.0.0",
  "author": "Ihr Name",
  "plugin_type": "audio_generation",
  "runtime_type": "api_call",
  "config_schema": {
    "api_key": {
      "type": "string",
      "required": true,
      "secret": true,
      "title": "ElevenLabs API Key"
    }
  },
  "manifest": {
    "functions": [
      {
        "name": "text_to_speech",
        "description": "Convert text to speech"
      }
    ]
  }
}`}
              />
              {jsonError && (
                <div className="mt-2 text-sm text-red-600">{jsonError}</div>
              )}
            </div>
            
            <div className="flex justify-between">
              <div className="text-sm text-gray-600">
                💡 <strong>Tipp:</strong> Kopieren Sie ein Plugin-JSON aus <code>backend/examples/</code> oder von der API-Dokumentation
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowJsonImport(false);
                    setJsonImportText('');
                    setJsonError('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleJsonImport}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                  disabled={!jsonImportText.trim()}
                >
                  JSON importieren
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Form Mode
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plugin Name *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="z.B. flux_image_generator"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anzeigename *
                </label>
                <input
                  type="text"
                  value={formData.display_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="z.B. Flux Image Generator"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschreibung *
              </label>
              <textarea 
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Plugin-Beschreibung eingeben"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Version *
                </label>
                <input
                  type="text"
                  value={formData.version || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="1.0.0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Autor *
                </label>
                <input
                  type="text"
                  value={formData.author || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Ihr Name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plugin-Typ
                </label>
                <select
                  value={formData.plugin_type || 'utility'}
                  onChange={(e) => setFormData(prev => ({ ...prev, plugin_type: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="image_generation">Bildgenerierung</option>
                  <option value="video_generation">Videogenerierung</option>
                  <option value="audio_generation">Audiogenerierung</option>
                  <option value="automation">Automatisierung</option>
                  <option value="utility">Utility</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Runtime-Typ
              </label>
              <select
                value={formData.runtime_type || 'api_call'}
                onChange={(e) => setFormData(prev => ({ ...prev, runtime_type: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="api_call">API Call</option>
                <option value="nodejs">Node.js</option>
                <option value="webhook">Webhook</option>
              </select>
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
                  checked={formData.is_public || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="ml-2 text-sm text-gray-700">Öffentlich</span>
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
                className="px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: '#84dcc6' }}
                disabled={!isFormValid}
              >
                <Save className="w-4 h-4" />
                {isEditing ? 'Änderungen speichern' : 'Plugin erstellen'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}; 