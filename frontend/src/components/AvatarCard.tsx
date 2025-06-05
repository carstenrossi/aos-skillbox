import React from 'react';
import { AvatarCardProps } from '../types';

const AvatarCard: React.FC<AvatarCardProps> = ({
  assistant,
  onClick,
  isLoading = false,
  className = '',
}) => {
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

  const handleClick = () => {
    if (!isLoading) {
      onClick(assistant);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={`avatar-card group ${className} ${
        isLoading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Open chat with ${assistant.display_name}`}
    >
      {/* Avatar Icon */}
      <div
        className={`
          w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center 
          text-4xl ${getGradientClass(assistant.name)} 
          shadow-lg group-hover:scale-110 transition-transform duration-300
        `}
      >
        {isLoading ? (
          <div className="spinner text-white"></div>
        ) : (
          <span className="drop-shadow-sm">{assistant.icon}</span>
        )}
      </div>

      {/* Assistant Info */}
      <div className="space-y-3">
        <h3 className="text-2xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors">
          {assistant.display_name}
        </h3>
        
        <p className="text-gray-600 leading-relaxed text-sm line-clamp-3">
          {assistant.description}
        </p>

        {/* Model Badge */}
        <div className="flex justify-center">
          <span className="inline-block bg-gradient-skillbox text-white px-4 py-2 rounded-full text-xs font-medium">
            {assistant.model_name}
          </span>
        </div>
      </div>

      {/* Hover Effect Overlay */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
    </div>
  );
};

export default AvatarCard; 