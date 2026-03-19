import React from 'react';
import { useAppStore } from '../store/useAppStore';

export const ControlPanel: React.FC = () => {
    const { recipe, updateRecipe, orderEstimated, turbulenceEstimated } = useAppStore();

    const handleSlider = (key: keyof typeof recipe) => (e: React.ChangeEvent<HTMLInputElement>) => {
        updateRecipe({ [key]: parseFloat(e.target.value) });
    };

    const applyPreset = (presetName: string) => {
        switch (presetName) {
            case 'Mountain Fog':
                // Max blur, low fineness, high spread to kill swirl, low density to create seamless clouds
                updateRecipe({ fineness: 0.0, direction: 90, spread: 1.0, density: 0.03, speed: 0.5, blurStrength: 80.0, focusDistance: 5.0, focalRange: 0.1 });
                break;
            case 'Fine Mist': // Fine Mist & Slow Drift
                updateRecipe({ fineness: 0.9, direction: 90, spread: 0.0, density: 0.15, speed: 0.2, blurStrength: 25.0 });
                break;
            case 'River':
                updateRecipe({ fineness: 0.2, direction: 90, spread: 0.1, density: 0.8, speed: 1.5 });
                break;
            case 'Storm':
                updateRecipe({ fineness: 0.9, direction: 45, spread: 0.8, density: 1.0, speed: 3.0 });
                break;
            case 'Insects':
                updateRecipe({ fineness: 0.1, direction: 0, spread: 1.0, density: 0.3, speed: 0.5 });
                break;
        }
    }

    return (
        <div className="panel control-panel">
            <h2>Controls</h2>

            <div className="presets" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <button className="preset-btn" onClick={() => applyPreset('Mountain Fog')}>Mountain Fog</button>
                <button className="preset-btn" onClick={() => applyPreset('Fine Mist')}>Fine Mist</button>
                <button className="preset-btn" onClick={() => applyPreset('River')}>River</button>
                <button className="preset-btn" onClick={() => applyPreset('Storm')}>Storm</button>
                <button className="preset-btn" onClick={() => applyPreset('Insects')}>Insects</button>
            </div>

            <div className="estimates">
                <p>Estimated Order: {orderEstimated.toFixed(2)}</p>
                <p>Estimated Turb.: {turbulenceEstimated.toFixed(2)}</p>
            </div>

            <div className="sliders">
                <div className="slider-group">
                    <label>Fineness: {recipe.fineness.toFixed(2)}</label>
                    <input type="range" min="0" max="1" step="0.01" value={recipe.fineness} onChange={handleSlider('fineness')} />
                </div>

                <div className="slider-group">
                    <label>Direction: {recipe.direction.toFixed(0)}°</label>
                    <input type="range" min="0" max="360" step="1" value={recipe.direction} onChange={handleSlider('direction')} />
                </div>

                <div className="slider-group">
                    <label>Spread: {recipe.spread.toFixed(2)}</label>
                    <input type="range" min="0" max="1" step="0.01" value={recipe.spread} onChange={handleSlider('spread')} />
                </div>

                <div className="slider-group">
                    <label>Density: {recipe.density.toFixed(2)}</label>
                    <input type="range" min="0" max="1" step="0.01" value={recipe.density} onChange={handleSlider('density')} />
                </div>

                <div className="slider-group">
                    <label>Speed: {recipe.speed.toFixed(2)}</label>
                    <input type="range" min="0" max="5" step="0.1" value={recipe.speed} onChange={handleSlider('speed')} />
                </div>

                <div className="slider-group">
                    <label>Camera Z: {recipe.cameraZ.toFixed(2)}</label>
                    <input type="range" min="0.1" max="5" step="0.1" value={recipe.cameraZ} onChange={handleSlider('cameraZ')} />
                </div>

                <div className="slider-group">
                    <label>Focus Dist: {recipe.focusDistance.toFixed(2)}</label>
                    <input type="range" min="0" max="5" step="0.1" value={recipe.focusDistance} onChange={handleSlider('focusDistance')} />
                </div>

                <div className="slider-group">
                    <label>Focal Range: {recipe.focalRange.toFixed(2)}</label>
                    <input type="range" min="0" max="2" step="0.1" value={recipe.focalRange} onChange={handleSlider('focalRange')} />
                </div>

                <div className="slider-group">
                    <label>Blur Str: {recipe.blurStrength.toFixed(1)}</label>
                    <input type="range" min="0" max="50" step="1" value={recipe.blurStrength} onChange={handleSlider('blurStrength')} />
                </div>

                <div className="slider-group">
                    <label>Beat Sensitivity: {recipe.beatSensitivity.toFixed(2)}</label>
                    <input type="range" min="0" max="2" step="0.01" value={recipe.beatSensitivity} onChange={handleSlider('beatSensitivity')} />
                </div>

                <div className="slider-group">
                    <label>Seed: {recipe.seed}</label>
                    <input type="number" value={recipe.seed} onChange={(e) => updateRecipe({ seed: parseInt(e.target.value) || 0 })} />
                </div>
            </div>
        </div>
    );
};
