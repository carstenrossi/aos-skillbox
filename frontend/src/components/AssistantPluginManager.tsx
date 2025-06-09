import React, { useState, useEffect } from 'react';
import { Settings2, Plus, Settings, Trash2, Move } from 'lucide-react';
import { Assistant, Plugin, AssistantPlugin } from '../types';
import { ApiService } from '../services/api';

interface AssistantPluginManagerProps {
  assistant: Assistant;
  onClose: () => void;
}

export const AssistantPluginManager: React.FC<AssistantPluginManagerProps> = ({
  assistant,
  onClose
}) => {
  const [availablePlugins, setAvailablePlugins] = useState<Plugin[]>([]);
  const [assignedPlugins, setAssignedPlugins] = useState<AssistantPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [assistant.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pluginsResponse, assignedResponse] = await Promise.all([
        ApiService.getPlugins(),
        ApiService.getAssistantPlugins(assistant.id)
      ]);

      if (pluginsResponse.success && pluginsResponse.data) {
        setAvailablePlugins(pluginsResponse.data);
      }

      if (assignedResponse.success && assignedResponse.data) {
        setAssignedPlugins(assignedResponse.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const assignPlugin = async (pluginId: string) => {
    try {
      const response = await ApiService.assignPluginToAssistant(assistant.id, pluginId);
      if (response.success) {
        await loadData(); // Reload data
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Zuweisen');
    }
  };

  const unassignPlugin = async (pluginId: string) => {
    try {
      const response = await ApiService.unassignPluginFromAssistant(assistant.id, pluginId);
      if (response.success) {
        await loadData(); // Reload data
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Entfernen');
    }
  };

  const togglePlugin = async (assignedPlugin: AssistantPlugin) => {
    try {
      const response = await ApiService.updateAssistantPlugin(
        assistant.id,
        assignedPlugin.plugin_id,
        { is_enabled: !assignedPlugin.is_enabled }
      );
      if (response.success) {
        await loadData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Umschalten');
    }
  };

  const getAssignedPluginIds = () => {
    return assignedPlugins.map(ap => ap.plugin_id);
  };

  const getUnassignedPlugins = () => {
    const assignedIds = getAssignedPluginIds();
    return availablePlugins.filter(plugin => !assignedIds.includes(plugin.id));
  };

  const getPluginDetails = (pluginId: string) => {
    return availablePlugins.find(p => p.id === pluginId);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Settings2 className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Plugin-Management
              </h2>
              <p className="text-sm text-gray-600">
                {assistant.display_name || assistant.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Zugewiesene Plugins */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Zugewiesene Plugins ({assignedPlugins.length})
            </h3>
            
            <div className="space-y-3">
              {assignedPlugins.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Settings2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Keine Plugins zugewiesen</p>
                </div>
              ) : (
                assignedPlugins
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((assignedPlugin) => {
                    const plugin = getPluginDetails(assignedPlugin.plugin_id);
                    if (!plugin) return null;

                    return (
                      <div
                        key={assignedPlugin.id}
                        className={`p-4 border rounded-lg ${
                          assignedPlugin.is_enabled
                            ? 'border-green-200 bg-green-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900">
                                {plugin.display_name}
                              </h4>
                              <span className={`px-2 py-1 text-xs rounded ${
                                assignedPlugin.is_enabled
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {assignedPlugin.is_enabled ? 'Aktiv' : 'Inaktiv'}
                              </span>
                              <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                                {plugin.plugin_type}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {plugin.description}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => togglePlugin(assignedPlugin)}
                              className={`px-3 py-1 text-sm rounded ${
                                assignedPlugin.is_enabled
                                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                  : 'bg-green-100 text-green-800 hover:bg-green-200'
                              }`}
                            >
                              {assignedPlugin.is_enabled ? 'Deaktivieren' : 'Aktivieren'}
                            </button>
                            <button
                              onClick={() => unassignPlugin(assignedPlugin.plugin_id)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded"
                              title="Plugin entfernen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Verfügbare Plugins */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Verfügbare Plugins ({getUnassignedPlugins().length})
            </h3>
            
            <div className="space-y-3">
              {getUnassignedPlugins().length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Plus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Alle Plugins bereits zugewiesen</p>
                </div>
              ) : (
                getUnassignedPlugins().map((plugin) => (
                  <div
                    key={plugin.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">
                            {plugin.display_name}
                          </h4>
                          <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                            {plugin.plugin_type}
                          </span>
                          {plugin.is_public && (
                            <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                              Öffentlich
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {plugin.description}
                        </p>
                        <div className="text-xs text-gray-500 mt-2">
                          Version: {plugin.version} • {plugin.author}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => assignPlugin(plugin.id)}
                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Hinzufügen
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {assignedPlugins.filter(ap => ap.is_enabled).length} von{' '}
            {assignedPlugins.length} Plugins aktiv
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}; 