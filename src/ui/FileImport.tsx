import React, { useCallback, useRef, useState } from 'react';

interface FileImportProps {
    onFileLoaded: (file: File) => void;
    fileName: string | null;
    fileInfo: string | null;
    loading: boolean;
    onClear: () => void;
}

const FileImport: React.FC<FileImportProps> = ({
    onFileLoaded,
    fileName,
    fileInfo,
    loading,
    onClear,
}) => {
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) onFileLoaded(file);
        },
        [onFileLoaded]
    );

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) onFileLoaded(file);
        },
        [onFileLoaded]
    );

    if (fileName) {
        return (
            <div className="file-info-bar fade-in">
                <span className="file-name">🎵 {fileName}</span>
                <span className="file-meta">{fileInfo}</span>
                <button className="btn-clear" onClick={onClear} disabled={loading}>
                    ✕
                </button>
            </div>
        );
    }

    return (
        <div className="file-import">
            <div
                className={`drop-zone glass-card ${dragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
            >
                <div className="icon">🎧</div>
                <div className="title">音声ファイルをドロップ</div>
                <div className="subtitle">またはクリックして選択</div>
                <div className="formats">
                    <span className="format-badge">WAV</span>
                    <span className="format-badge">AIFF</span>
                    <span className="format-badge">AIF</span>
                </div>
            </div>
            <input
                ref={inputRef}
                type="file"
                accept=".wav,.aiff,.aif,audio/wav,audio/aiff"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />
        </div>
    );
};

export default FileImport;
