import React, { useState, useCallback } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  fileTypes?: string[];
  maxSize?: number; // in bytes
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  fileTypes = ['application/json'],
  maxSize = 5 * 1024 * 1024, // 5MB
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);

  const validateFile = (file: File): string | null => {
    if (!fileTypes.includes(file.type)) {
      return `Invalid file type. Please select a ${fileTypes.join(', ')} file.`;
    }
    if (file.size > maxSize) {
      return `File size exceeds the limit of ${(maxSize / 1024 / 1024).toFixed(1)}MB.`;
    }
    return null;
  };

  const processFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSelectedFile(file);
    onFileSelect(file);

    // Simulate upload progress
    setProgress(0);
    const timer = setInterval(() => {
      setProgress(oldProgress => {
        if (oldProgress === 100) {
          clearInterval(timer);
          return 100;
        }
        const newProgress = Math.min(oldProgress + 10, 100);
        return newProgress;
      });
    }, 200);
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      processFile(event.target.files[0]);
    }
  };

  const handleDropZoneClick = () => {
    const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-primary bg-primary/5' : 'border-base-300 hover:border-primary/50'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleDropZoneClick}
      >
        <div className="flex flex-col items-center gap-2">
          <svg
            className="w-8 h-8 text-base-content/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          {isDragActive ? (
            <p className="text-primary">Drop the files here...</p>
          ) : (
            <p className="text-base-content/70">
              Drag 'n' drop files here, or click to select files
            </p>
          )}
          <p className="text-sm text-base-content/50">
            Supports: {fileTypes.map(type => type.split('/')[1]).join(', ')} files
          </p>
        </div>
      </div>

      <div className="mt-4">
        <input
          id="file-upload-input"
          type="file"
          className="file-input file-input-bordered w-full"
          onChange={handleFileChange}
          accept={fileTypes.join(',')}
        />
      </div>

      {error && (
        <div className="alert alert-error mt-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {selectedFile && (
        <div className="mt-4 p-4 bg-base-200 rounded-lg">
          <h4 className="font-bold text-base-content mb-2">Selected File:</h4>
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="text-base-content">{selectedFile.name}</span>
          </div>
          <p className="text-sm text-base-content/70 mb-2">
            Size: {(selectedFile.size / 1024).toFixed(1)} KB
          </p>
          {progress > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Upload Progress</span>
                <span>{progress}%</span>
              </div>
              <progress
                className="progress progress-primary w-full"
                value={progress}
                max="100"
              ></progress>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;