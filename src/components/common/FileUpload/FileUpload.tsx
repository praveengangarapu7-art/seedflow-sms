import { useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import styles from './FileUpload.module.css';

interface UploadedFile {
  name: string;
  size: number;
  preview?: string;
}

interface FileUploadProps {
  label?: string;
  accept?: string;
  multiple?: boolean;
  onFilesAdded: (files: File[]) => void;
  uploadedFiles?: UploadedFile[];
  onRemoveFile?: (index: number) => void;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function isImageFile(name: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
}

export function FileUpload({
  label,
  accept,
  multiple = false,
  onFilesAdded,
  uploadedFiles = [],
  onRemoveFile,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleClick() {
    inputRef.current?.click();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesAdded(Array.from(files));
    }
    // Reset so the same file can be re-selected
    e.target.value = '';
  }

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesAdded(files);
    }
  }

  return (
    <div className={styles.root}>
      {label && <label className={styles.label}>{label}</label>}

      {/* Drop zone */}
      <div
        className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ''}`}
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        aria-label="File upload drop zone"
      >
        <Upload size={24} className={styles.uploadIcon} />
        <p className={styles.dropText}>Drop files here or click to browse</p>
        <p className={styles.helperText}>PNG, JPG, PDF up to 10MB</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className={styles.hiddenInput}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* File list */}
      {uploadedFiles.length > 0 && (
        <ul className={styles.fileList}>
          {uploadedFiles.map((file, idx) => (
            <li key={`${file.name}-${idx}`} className={styles.fileItem}>
              {file.preview && isImageFile(file.name) ? (
                <img
                  src={file.preview}
                  alt={file.name}
                  className={styles.thumbnail}
                />
              ) : (
                <FileText size={16} className={styles.fileIcon} />
              )}
              <span className={styles.fileName} title={file.name}>
                {file.name}
              </span>
              <span className={styles.fileSize}>{formatSize(file.size)}</span>
              {onRemoveFile && (
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => onRemoveFile(idx)}
                  aria-label={`Remove ${file.name}`}
                >
                  <X size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
