import React, { useState, useRef } from 'react';
import { Camera, X } from 'lucide-react';
import styles from './PhotoUpload.module.css';

interface PhotoUploadProps {
  photos: Array<{ id: string; url: string; caption?: string }>;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onCaptionChange?: (id: string, caption: string) => void;
  maxPhotos?: number;
  required?: boolean;
  label?: string;
  helpText?: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  photos, onAdd, onRemove, onCaptionChange, maxPhotos = 10, required, label, helpText
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ id: string; url: string; caption?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAdd(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAdd(Array.from(e.target.files));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {label && <label className={styles.label}>{label} {required && <span className={styles.required}>*</span>}</label>}
        <span className={styles.counter}>{photos.length} of {maxPhotos} photos</span>
      </div>
      
      <div 
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileSelect} 
        />
        <Camera size={24} className={styles.icon} />
        <p className={styles.text}>Drop photos or click to browse</p>
        {helpText && <p className={styles.helpText}>{helpText}</p>}
      </div>

      {photos.length > 0 && (
        <div className={styles.grid}>
          {photos.map(photo => (
            <div key={photo.id} className={styles.thumbnailContainer} onClick={() => setLightboxPhoto(photo)}>
              <div 
                className={styles.thumbnail} 
                style={{ backgroundImage: `url(${photo.url})`, backgroundColor: 'var(--color-accent)' }}
              >
                {!photo.url.startsWith('http') && !photo.url.startsWith('data:') && (
                  <span className={styles.placeholderText}>{photo.caption || 'Photo'}</span>
                )}
              </div>
              <div className={styles.overlay}>
                <button 
                  type="button" 
                  className={styles.removeBtn} 
                  onClick={(e) => { e.stopPropagation(); onRemove(photo.id); }}
                >
                  <X size={14} />
                </button>
                {onCaptionChange && (
                  <input
                    type="text"
                    className={styles.captionInput}
                    value={photo.caption || ''}
                    placeholder="Add caption"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onCaptionChange(photo.id, e.target.value)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {lightboxPhoto && (
        <div className={styles.lightbox} onClick={() => setLightboxPhoto(null)}>
          <div className={styles.lightboxContent} onClick={e => e.stopPropagation()}>
            <button className={styles.lightboxClose} onClick={() => setLightboxPhoto(null)}>
              <X size={24} />
            </button>
            {lightboxPhoto.url.startsWith('http') || lightboxPhoto.url.startsWith('data:') ? (
              <img src={lightboxPhoto.url} alt={lightboxPhoto.caption} className={styles.lightboxImg} />
            ) : (
              <div className={styles.lightboxPlaceholder}>
                 {lightboxPhoto.caption || 'Photo'}
              </div>
            )}
            {onCaptionChange && (
              <input
                type="text"
                className={styles.lightboxCaption}
                value={lightboxPhoto.caption || ''}
                placeholder="Add caption..."
                onChange={(e) => {
                  onCaptionChange(lightboxPhoto.id, e.target.value);
                  setLightboxPhoto({ ...lightboxPhoto, caption: e.target.value });
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
