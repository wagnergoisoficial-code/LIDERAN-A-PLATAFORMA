import React, { useRef, useState } from 'react';

interface ImageUploadInputProps {
  onImageSelect: (file: File | null) => void;
  imagePreview: string | null;
}

const ImageUploadInput: React.FC<ImageUploadInputProps> = ({ 
  onImageSelect, 
  imagePreview 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Por favor, selecione um arquivo de imagem válido (JPEG, PNG, GIF, WebP)');
        return;
      }

      // Validate file size (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('O arquivo é muito grande. Máximo 5MB.');
        return;
      }

      setFileName(file.name);
      onImageSelect(file);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.preventDefault();
    setFileName('');
    onImageSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="uk-margin">
      <div className="uk-card uk-card-small uk-card-default">
        {/* Image Preview */}
        {imagePreview && (
          <div className="uk-card-media-top">
            <img 
              src={imagePreview} 
              alt="Preview" 
              style={{ maxHeight: '300px', objectFit: 'cover', width: '100%' }}
            />
          </div>
        )}

        {/* Upload Area */}
        <div className="uk-card-body">
          {!imagePreview ? (
            <>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border-strong)',
                  borderRadius: 'var(--radius)',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-surface)',
                  transition: 'all 0.3s ease'
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                  e.currentTarget.style.borderColor = 'var(--text-muted)';
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                  e.currentTarget.style.borderColor = 'var(--border-strong)';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                  e.currentTarget.style.borderColor = 'var(--border-strong)';
                  
                  const files = e.dataTransfer.files;
                  if (files.length > 0) {
                    const file = files[0];
                    if (file.type.startsWith('image/')) {
                      if (fileInputRef.current) {
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        fileInputRef.current.files = dataTransfer.files;
                        handleFileChange({
                          target: { files: dataTransfer.files }
                        } as React.ChangeEvent<HTMLInputElement>);
                      }
                    }
                  }
                }}
              >
                <div className="uk-margin-small-bottom">
                  <svg uk-icon="icon: image; ratio: 3" className="uk-text-muted"></svg>
                </div>
                <p className="uk-text-bold uk-margin-small-bottom">Clique ou arraste uma imagem</p>
                <p className="uk-text-small uk-text-muted">
                  JPEG, PNG, GIF ou WebP • Máximo 5MB
                </p>
              </div>
            </>
          ) : (
            <div>
              <p className="uk-margin-small-bottom">
                <span className="uk-icon-button" uk-icon="icon: check; ratio: 1.5"></span>
                <span className="uk-text-bold uk-margin-small-left">{fileName}</span>
              </p>
              <button
                onClick={handleRemoveImage}
                className="uk-button uk-button-small uk-button-default"
                type="button"
              >
                Remover imagem
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      </div>
      <p className="uk-text-small uk-text-muted uk-margin-small-top">
        ✓ Opcional: Você pode publicar apenas texto ou texto + imagem
      </p>
    </div>
  );
};

export default ImageUploadInput;
