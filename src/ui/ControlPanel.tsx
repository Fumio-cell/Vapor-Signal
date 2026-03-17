import React from 'react';
import type { FftSize, ExportMode } from '../types/types';

interface ControlPanelProps {
    fLow: number;
    fHigh: number;
    fftSize: FftSize;
    shiftHz: number;
    exportMode: ExportMode;
    sampleRate: number;
    disabled: boolean;
    onFLowChange: (v: number) => void;
    onFHighChange: (v: number) => void;
    onFftSizeChange: (v: FftSize) => void;
    onShiftHzChange: (v: number) => void;
    onExportModeChange: (v: ExportMode) => void;
    timeStart: number;
    timeEnd: number;
    duration: number;
    onTimeStartChange: (v: number) => void;
    onTimeEndChange: (v: number) => void;
    sourcePitch: number;
    targetPitch: number;
    onSourcePitchChange: (v: number) => void;
    onTargetPitchChange: (v: number) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
    fLow,
    fHigh,
    fftSize,
    shiftHz,
    exportMode,
    sampleRate,
    disabled,
    onFLowChange,
    onFHighChange,
    onFftSizeChange,
    onShiftHzChange,
    onExportModeChange,
    timeStart,
    timeEnd,
    duration,
    onTimeStartChange,
    onTimeEndChange,
    sourcePitch,
    targetPitch,
    onSourcePitchChange,
    onTargetPitchChange,
}) => {
    const nyquist = sampleRate / 2 || 22050;

    return (
        <>
            {/* Export Mode */}
            <div className="control-section">
                <div className="section-title">エクスポートモード</div>
                <div className="mode-select">
                    <button
                        className={`mode-option ${exportMode === 'bandExport' ? 'active' : ''}`}
                        onClick={() => onExportModeChange('bandExport')}
                        disabled={disabled}
                    >
                        Band Export
                    </button>
                    <button
                        className={`mode-option ${exportMode === 'shiftExport' ? 'active' : ''}`}
                        onClick={() => onExportModeChange('shiftExport')}
                        disabled={disabled}
                    >
                        Freq Shift
                    </button>
                    <button
                        className={`mode-option ${exportMode === 'retuneExport' ? 'active' : ''}`}
                        onClick={() => onExportModeChange('retuneExport')}
                        disabled={disabled}
                    >
                        🎵 Retune
                    </button>
                </div>
            </div>

            {/* Band Selection */}
            <div className="control-section">
                <div className="section-title">帯域設定</div>

                <div className="control-group">
                    <label>
                        下限周波数 (f_low)
                        <span className="value-display"> {fLow} Hz</span>
                    </label>
                    <input
                        type="range"
                        min={0}
                        max={Math.min(fHigh - 1, nyquist)}
                        step={1}
                        value={fLow}
                        onChange={(e) => onFLowChange(Number(e.target.value))}
                        disabled={disabled}
                    />
                    <input
                        type="number"
                        min={0}
                        max={fHigh - 1}
                        value={fLow}
                        onChange={(e) => onFLowChange(Number(e.target.value))}
                        disabled={disabled}
                    />
                </div>

                <div className="control-group">
                    <label>
                        上限周波数 (f_high)
                        <span className="value-display"> {fHigh} Hz</span>
                    </label>
                    <input
                        type="range"
                        min={fLow + 1}
                        max={nyquist}
                        step={1}
                        value={fHigh}
                        onChange={(e) => onFHighChange(Number(e.target.value))}
                        disabled={disabled}
                    />
                    <input
                        type="number"
                        min={fLow + 1}
                        max={nyquist}
                        value={fHigh}
                        onChange={(e) => onFHighChange(Number(e.target.value))}
                        disabled={disabled}
                    />
                </div>
            </div>

            {/* Frequency Shift (Mode A) */}
            {exportMode === 'shiftExport' && (
                <div className="control-section fade-in">
                    <div className="section-title">周波数シフト (Mode A)</div>
                    <div className="control-group">
                        <label>
                            シフト量
                            <span className="value-display">
                                {' '}
                                {shiftHz > 0 ? '+' : ''}
                                {shiftHz} Hz
                            </span>
                        </label>
                        <input
                            type="range"
                            min={-5000}
                            max={5000}
                            step={10}
                            value={shiftHz}
                            onChange={(e) => onShiftHzChange(Number(e.target.value))}
                            disabled={disabled}
                        />
                        <input
                            type="number"
                            value={shiftHz}
                            onChange={(e) => onShiftHzChange(Number(e.target.value))}
                            disabled={disabled}
                        />
                    </div>
                </div>
            )}

            {/* Pitch Retune */}
            {exportMode === 'retuneExport' && (
                <div className="control-section fade-in">
                    <div className="section-title">🎵 基準ピッチ変換</div>

                    <div className="control-group">
                        <label>プリセット</label>
                        <div className="preset-buttons">
                            <button
                                className={`preset-btn ${sourcePitch === 440 && targetPitch === 432 ? 'active' : ''}`}
                                onClick={() => { onSourcePitchChange(440); onTargetPitchChange(432); }}
                                disabled={disabled}
                            >
                                440→432Hz
                            </button>
                            <button
                                className={`preset-btn ${sourcePitch === 440 && targetPitch === 444 ? 'active' : ''}`}
                                onClick={() => { onSourcePitchChange(440); onTargetPitchChange(444); }}
                                disabled={disabled}
                            >
                                440→444Hz
                            </button>
                            <button
                                className={`preset-btn ${sourcePitch === 440 && targetPitch === 442 ? 'active' : ''}`}
                                onClick={() => { onSourcePitchChange(440); onTargetPitchChange(442); }}
                                disabled={disabled}
                            >
                                440→442Hz
                            </button>
                        </div>
                    </div>

                    <div className="control-group">
                        <label>
                            元の基準 (A4)
                            <span className="value-display"> {sourcePitch} Hz</span>
                        </label>
                        <input
                            type="number"
                            min={400}
                            max={480}
                            step={1}
                            value={sourcePitch}
                            onChange={(e) => onSourcePitchChange(Number(e.target.value))}
                            disabled={disabled}
                        />
                    </div>

                    <div className="control-group">
                        <label>
                            変換先 (A4)
                            <span className="value-display"> {targetPitch} Hz</span>
                        </label>
                        <input
                            type="number"
                            min={400}
                            max={480}
                            step={1}
                            value={targetPitch}
                            onChange={(e) => onTargetPitchChange(Number(e.target.value))}
                            disabled={disabled}
                        />
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '4px 0' }}>
                        比率: ×{(targetPitch / sourcePitch).toFixed(6)}
                        （{((targetPitch / sourcePitch - 1) * 100).toFixed(2)}%）
                    </div>
                </div>
            )}

            {/* FFT Settings */}
            <div className="control-section">
                <div className="section-title">FFT 設定</div>
                <div className="control-group">
                    <label>FFT Size</label>
                    <select
                        value={fftSize}
                        onChange={(e) => onFftSizeChange(Number(e.target.value) as FftSize)}
                        disabled={disabled}
                    >
                        <option value={2048}>2048</option>
                        <option value={4096}>4096（推奨）</option>
                        <option value={8192}>8192</option>
                    </select>
                </div>
            </div>

            {/* Time Range */}
            {duration > 0 && (
                <div className="control-section">
                    <div className="section-title">時間範囲</div>
                    <div className="control-group">
                        <label>
                            開始
                            <span className="value-display"> {timeStart.toFixed(2)}s</span>
                        </label>
                        <input
                            type="range"
                            min={0}
                            max={Math.max(0, timeEnd - 0.01)}
                            step={0.01}
                            value={timeStart}
                            onChange={(e) => onTimeStartChange(Number(e.target.value))}
                            disabled={disabled}
                        />
                    </div>
                    <div className="control-group">
                        <label>
                            終了
                            <span className="value-display"> {timeEnd.toFixed(2)}s</span>
                        </label>
                        <input
                            type="range"
                            min={timeStart + 0.01}
                            max={duration}
                            step={0.01}
                            value={timeEnd}
                            onChange={(e) => onTimeEndChange(Number(e.target.value))}
                            disabled={disabled}
                        />
                    </div>
                </div>
            )}
        </>
    );
};

export default ControlPanel;
