import React, { useState, useEffect } from 'react';
import { ExternalLink, Wrench, Globe, Calculator, FileText, Database, Code, ChevronDown, ChevronUp } from 'lucide-react';
import { ApiService } from '../services/api';

export interface ToolItem {
  id: number;
  name: string;
  description: string;
  url: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  is_external: boolean;
}

interface ToolboxProps {
  userRole?: string;
  className?: string;
}

// Icon-Mapping für die verfügbaren Icons
const iconMap: { [key: string]: React.ComponentType<any> } = {
  'Wrench': Wrench,
  'Globe': Globe,
  'Calculator': Calculator,
  'FileText': FileText,
  'Database': Database,
  'Code': Code,
  'ExternalLink': ExternalLink
};

export const Toolbox: React.FC<ToolboxProps> = ({ userRole, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tools von der API laden
  useEffect(() => {
    const fetchTools = async () => {
      try {
        setIsLoading(true);
        const toolsResponse = await ApiService.getTools();
        
        // Handle new API response format
        if (toolsResponse.success && Array.isArray(toolsResponse.data)) {
          setTools(toolsResponse.data);
        } else if (Array.isArray(toolsResponse)) {
          // Fallback for old format
          setTools(toolsResponse);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching tools:', err);
        setError('Fehler beim Laden der Tools');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTools();
  }, []);

  const handleToolClick = (tool: ToolItem) => {
    if (tool.is_external) {
      window.open(tool.url, '_blank', 'noopener,noreferrer');
    } else {
      // Für interne Tools könnte hier eine andere Navigation stattfinden
      window.location.href = tool.url;
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Globe;
    return <IconComponent size={20} />;
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Tools werden geladen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
        <div className="p-6 text-center">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
        <div className="p-6 text-center">
          <Wrench size={48} className="mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500">Keine Tools verfügbar</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 transition-all duration-300 ${className}`}>
      {/* Header mit Toggle */}
      <div className="px-6 py-4 border-b border-gray-200">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-left hover:bg-gray-50 -mx-2 px-2 py-1 rounded"
        >
          <div className="flex items-center">
            <Wrench size={20} className="mr-3 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Externe Tools & Ressourcen
            </h2>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-2">
              {tools.length} Tool{tools.length !== 1 ? 's' : ''}
            </span>
            {isExpanded ? (
              <ChevronUp size={20} className="text-gray-400" />
            ) : (
              <ChevronDown size={20} className="text-gray-400" />
            )}
          </div>
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool)}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-50 rounded-lg mr-3 group-hover:bg-blue-100 transition-colors">
                      {getIcon(tool.icon)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">
                        {tool.name}
                      </h3>
                    </div>
                  </div>
                  {tool.is_external && (
                    <ExternalLink 
                      size={16} 
                      className="text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" 
                    />
                  )}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {tool.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 