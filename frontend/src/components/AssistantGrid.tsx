import React from 'react';
import { Assistant } from '../data/assistants';

interface AssistantGridProps {
  assistants: Assistant[];
  onSelectAssistant: (assistant: Assistant) => void;
}

export const AssistantGrid: React.FC<AssistantGridProps> = ({ 
  assistants, 
  onSelectAssistant 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {assistants.map((assistant) => (
        <div
          key={assistant.id}
          onClick={() => onSelectAssistant(assistant)}
          className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105 hover:bg-white/80"
        >
          <div className="text-center">
            {/* Test comment to force git update */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1e2235] flex items-center justify-center text-white text-2xl font-bold">
              {assistant.icon}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {assistant.display_name}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {assistant.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}; 