import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, File, Image as ImageIcon, FileText } from 'lucide-react';
import { translations } from '../utils/translations';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  onUpload?: (files: File[]) => Promise<void>;
  maxFiles?: number;
  maxSize?: number; // in MB
  allowedTypes?: string[];
  disabled?: boolean;
  className?: string;
  language?: 'de' | 'en';
}

interface FileWithPreview {
  file: File;
  preview?: string;
  progress?: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  onUpload,
  maxFiles = 5,
  maxSize = 10, // 10MB default
  allowedTypes = [
    'image/*', 
    'text/*', 
    'audio/*', 
    'video/*',
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-zip-compressed'
  ],
  disabled = false,
  className = '',
  language = 'de',
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[language];

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `${t.errors.fileTooBig} (max ${maxSize}MB)`;
    }

    // Check file type
    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isAllowed) {
      return t.errors.fileNotAllowed;
    }

    return null;
  }, [maxSize, allowedTypes, t]);

  const createFilePreview = useCallback((file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  }, []);

  const processFiles = useCallback(async (fileList: FileList) => {
    const newFiles: FileWithPreview[] = [];
    
    for (let i = 0; i < Math.min(fileList.length, maxFiles - files.length); i++) {
      const file = fileList[i];
      const error = validateFile(file);
      
      const preview = await createFilePreview(file);
      
      newFiles.push({
        file,
        preview,
        status: error ? 'error' : 'pending',
        error: error || undefined,
      });
    }

    setFiles(prev => [...prev, ...newFiles]);
    
    // Call onFilesSelected with valid files
    const validFiles = newFiles.filter(f => f.status === 'pending').map(f => f.file);
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  }, [files.length, maxFiles, validateFile, createFilePreview, onFilesSelected]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList) {
      processFiles(fileList);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const fileList = e.dataTransfer.files;
    if (fileList) {
      processFiles(fileList);
    }
  }, [disabled, processFiles]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = useCallback(async () => {
    if (!onUpload || isUploading) return;

    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    try {
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.status === 'pending' ? { ...f, status: 'uploading' as const, progress: 0 } : f
      ));

      await onUpload(pendingFiles.map(f => f.file));

      // Update status to completed
      setFiles(prev => prev.map(f => 
        f.status === 'uploading' ? { ...f, status: 'completed' as const, progress: 100 } : f
      ));

    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.status === 'uploading' ? { 
          ...f, 
          status: 'error' as const, 
          error: error instanceof Error ? error.message : 'Upload fehlgeschlagen' 
        } : f
      ));
    } finally {
      setIsUploading(false);
    }
  }, [onUpload, isUploading, files]);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon size={20} />;
    if (file.type.startsWith('text/') || file.type.includes('document')) return <FileText size={20} />;
    return <File size={20} />;
  };

  const getStatusColor = (status: FileWithPreview['status']) => {
    switch (status) {
      case 'pending': return 'text-blue-600';
      case 'uploading': return 'text-yellow-600';
      case 'completed': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer
          ${isDragOver 
            ? 'border-skillbox-purple bg-skillbox-purple/10' 
            : 'border-gray-300 hover:border-skillbox-purple'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <Upload className="mx-auto mb-2 text-gray-400" size={32} />
        <p className="text-sm text-gray-600 mb-1">
          {isDragOver 
            ? 'Dateien hier ablegen...' 
            : 'Dateien hier ablegen oder klicken zum Auswählen'
          }
        </p>
        <p className="text-xs text-gray-500">
          Max {maxFiles} Dateien, {maxSize}MB pro Datei
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Ausgewählte Dateien ({files.length}/{maxFiles})
          </h4>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((fileItem, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                {/* File Preview/Icon */}
                <div className="flex-shrink-0">
                  {fileItem.preview ? (
                    <img
                      src={fileItem.preview}
                      alt={fileItem.file.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                      {getFileIcon(fileItem.file)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fileItem.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  
                  {/* Error Message */}
                  {fileItem.error && (
                    <p className="text-xs text-red-600 mt-1">
                      {fileItem.error}
                    </p>
                  )}

                  {/* Progress Bar */}
                  {fileItem.status === 'uploading' && typeof fileItem.progress === 'number' && (
                    <div className="mt-1">
                      <div className="bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-skillbox-purple h-1.5 rounded-full transition-all"
                          style={{ width: `${fileItem.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Status & Actions */}
                <div className="flex items-center space-x-2">
                  <span className={`text-xs ${getStatusColor(fileItem.status)}`}>
                    {fileItem.status === 'pending' && '⏳'}
                    {fileItem.status === 'uploading' && '⬆️'}
                    {fileItem.status === 'completed' && '✅'}
                    {fileItem.status === 'error' && '❌'}
                  </span>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    aria-label="Datei entfernen"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Upload Button */}
          {onUpload && files.some(f => f.status === 'pending') && (
            <button
              onClick={handleUpload}
              disabled={isUploading || disabled}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <div className="spinner mr-2" />
                  {t.chat.uploading}
                </>
              ) : (
                <>
                  <Upload className="mr-2" size={16} />
                  {t.chat.upload}
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload; 