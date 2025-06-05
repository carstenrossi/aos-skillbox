import React, { useState } from 'react';
import { Download, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageGalleryProps {
  images: string[];
  className?: string;
}

interface LightboxProps {
  image: string;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  currentIndex?: number;
  totalImages?: number;
}

const Lightbox: React.FC<LightboxProps> = ({
  image,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  currentIndex,
  totalImages,
}) => {
  const [zoom, setZoom] = useState(1);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(image);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft' && onPrevious) onPrevious();
    if (e.key === 'ArrowRight' && onNext) onNext();
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
        <div className="text-white text-sm">
          {currentIndex !== undefined && totalImages && (
            <span>{currentIndex + 1} von {totalImages}</span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Zoom Controls */}
          <button
            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
            className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
            aria-label="Herauszoomen"
          >
            <ZoomOut size={20} />
          </button>
          
          <span className="text-white text-sm px-2">
            {Math.round(zoom * 100)}%
          </span>
          
          <button
            onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
            className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
            aria-label="Hineinzoomen"
          >
            <ZoomIn size={20} />
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
            aria-label="Bild herunterladen"
          >
            <Download size={20} />
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
            aria-label="Schließen"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      {onPrevious && (
        <button
          onClick={onPrevious}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
          aria-label="Vorheriges Bild"
        >
          <span className="text-2xl">‹</span>
        </button>
      )}

      {onNext && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
          aria-label="Nächstes Bild"
        >
          <span className="text-2xl">›</span>
        </button>
      )}

      {/* Image */}
      <div className="max-w-full max-h-full overflow-auto">
        <img
          src={image}
          alt="AI-generiertes Bild"
          style={{ 
            transform: `scale(${zoom})`,
            transformOrigin: 'center',
            transition: 'transform 0.2s ease',
          }}
          className="max-w-none"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+QmlsZCBrb25udGUgbmljaHQgZ2VsYWRlbiB3ZXJkZW48L3RleHQ+PC9zdmc+';
          }}
        />
      </div>
    </div>
  );
};

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, className = '' }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextImage = () => {
    if (lightboxIndex !== null && lightboxIndex < images.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  const previousImage = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  return (
    <>
      <div className={`grid gap-2 ${className}`}>
        {images.length === 1 ? (
          // Single image - full width
          <div className="relative group cursor-pointer" onClick={() => openLightbox(0)}>
            <img
              src={images[0]}
              alt="AI-generiertes Bild"
              className="w-full max-w-md rounded-lg shadow-lg hover:shadow-xl transition-shadow"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+QmlsZCBrb25udGUgbmljaHQgZ2VsYWRlbiB3ZXJkZW48L3RleHQ+PC9zdmc+';
              }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
              <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={32} />
            </div>
          </div>
        ) : (
          // Multiple images - grid layout
          <div className={`grid gap-2 ${images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
            {images.map((image, index) => (
              <div
                key={index}
                className="relative group cursor-pointer aspect-square"
                onClick={() => openLightbox(index)}
              >
                <img
                  src={image}
                  alt={`AI-generiertes Bild ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+QmlsZCBrb25udGUgbmljaHQgZ2VsYWRlbiB3ZXJkZW48L3RleHQ+PC9zdmc+';
                  }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                  <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          image={images[lightboxIndex]}
          isOpen={true}
          onClose={closeLightbox}
          onNext={lightboxIndex < images.length - 1 ? nextImage : undefined}
          onPrevious={lightboxIndex > 0 ? previousImage : undefined}
          currentIndex={lightboxIndex}
          totalImages={images.length}
        />
      )}
    </>
  );
};

export default ImageGallery; 