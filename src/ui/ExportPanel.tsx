import React from 'react';
import type { ExportMode } from '../types/types';

interface ExportPanelProps {
    processing: boolean;
    progress: number;
    exportMode: ExportMode;
    disabled: boolean;
    onExport: () => void;
    onPreview: () => void;
    onCancel: () => void;
}

const ExportPanel: React.FC<ExportPanelProps> = ({
    processing,
    progress,
    exportMode,
    disabled,
    onExport,
    onPreview,
    onCancel,
}) => {
    const modeLabel = exportMode === 'bandExport' ? 'Band Export' : exportMode === 'retuneExport' ? 'Retune' : 'Freq Shift Export';

    return (
        <div className="export-section">
            <div className="control-section">
                <div className="section-title">出力</div>

                {processing ? (
                    <div className="fade-in">
                        <div className="progress-container">
                            <div className="progress-bar-bg">
                                <div
                                    className="progress-bar-fill"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="progress-text">{Math.round(progress)}% 処理中...</div>
                        </div>
                        <button
                            className="btn btn-danger"
                            onClick={onCancel}
                            style={{ width: '100%', marginTop: '8px' }}
                        >
                            キャンセル
                        </button>
                    </div>
                ) : (
                    <>
                        <button
                            className="btn btn-secondary"
                            onClick={onPreview}
                            disabled={disabled}
                            style={{ width: '100%', marginBottom: '8px' }}
                        >
                            🎧 プレビュー
                        </button>
                        <button
                            className="btn btn-primary pulse-glow"
                            onClick={onExport}
                            disabled={disabled}
                            style={{ width: '100%' }}
                        >
                            💾 {modeLabel} → WAV保存
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default ExportPanel;
