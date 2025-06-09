import React, { useState, useEffect } from 'react';
import { Save, Settings2 } from 'lucide-react';
import { Plugin } from '../types';
import { ApiService } from '../services/api';

interface PluginConfigModalProps {
  plugin: Plugin | null;
  onSave: (config: any) => void;
  onClose: () => void;
}

export const PluginConfigModal: React.FC<PluginConfigModalProps> = ({ 
  plugin, 
  onSave, 
  onClose 
}) => {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (plugin) {
      loadPluginConfig();
    }
  }, [plugin]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (plugin) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [plugin, onClose]);

  const loadPluginConfig = async () => {
    if (!plugin) return;
    
    try {
      const response = await ApiService.getPluginConfig(plugin.id);
      if (response.success && response.data) {
        let configData = response.data.config_data;
        
        // Parse config_data if it's a string
        if (typeof configData === 'string') {
          try {
            configData = JSON.parse(configData);
          } catch (e) {
            console.error('Failed to parse config_data:', e);
            configData = {};
          }
        }
        
        setConfig(configData || {});
      }
    } catch (error) {
      console.error('Error loading plugin config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!plugin) return;
    
    try {
      await ApiService.updatePluginConfig(plugin.id, config);
      onSave(config);
      onClose();
    } catch (error) {
      console.error('Error saving plugin config:', error);
      alert('Fehler beim Speichern der Konfiguration. Bitte versuchen Sie es erneut.');
    }
  };

  if (!plugin) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div 
        className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-semibold mb-4">
          {plugin.display_name} konfigurieren
        </h3>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Plugin-Informationen</h4>
              <p className="text-sm text-gray-600">{plugin.description}</p>
              <p className="text-xs text-gray-500 mt-1">Version {plugin.version} von {plugin.author}</p>
            </div>

            {/* Dynamic configuration based on plugin schema */}
            {(() => {
              // Parse config_schema if it's a string
              let configSchema = plugin.config_schema;
              if (typeof configSchema === 'string') {
                try {
                  configSchema = JSON.parse(configSchema);
                } catch (e) {
                  console.error('Failed to parse config_schema:', e);
                  configSchema = {};
                }
              }
              
              return configSchema && Object.keys(configSchema).length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Konfiguration</h4>
                  {Object.entries(configSchema).map(([key, schema]: [string, any]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {schema.title || key}
                      {schema.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {schema.type === 'string' && !schema.enum && !schema.values && (
                      <input
                        type={schema.secret || schema.format === 'password' ? 'password' : 'text'}
                        value={config[key] || schema.default || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder={schema.description || `${key} eingeben`}
                      />
                    )}
                    {schema.type === 'number' && (
                      <input
                        type="number"
                        min={schema.min}
                        max={schema.max}
                        value={config[key] || schema.default || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder={schema.description}
                      />
                    )}
                    {schema.type === 'boolean' && (
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config[key] !== undefined ? config[key] : schema.default || false}
                          onChange={(e) => setConfig(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{schema.description}</span>
                      </label>
                    )}
                    {(schema.enum || schema.values) && (
                      <select
                        value={config[key] || schema.default || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">Auswählen...</option>
                        {(schema.enum || schema.values || []).map((option: any) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    )}
                    {schema.description && (
                      <p className="text-xs text-gray-500 mt-1">{schema.description}</p>
                    )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Settings2 size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Dieses Plugin benötigt keine Konfiguration</p>
                </div>
              );
            })()}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center gap-2"
                style={{ backgroundColor: '#84dcc6' }}
              >
                <Save className="w-4 h-4" />
                Konfiguration speichern
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 