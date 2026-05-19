import { useState, useEffect } from 'react';
import { useBMS } from './contexts/BMSContext';
import { calculateRange, type CalculationInputs } from './utils/physics';
import { getBluetoothErrorMessage } from './utils/device';

function App() {
  const { isConnected, isConnecting, data: bmsData, connect, disconnect, error, isMockMode, toggleMockMode } = useBMS();

  // Inputs state
  const [inputs, setInputs] = useState<CalculationInputs>({
    voltage: 60,
    capacityAh: 40,
    riderWeightLbs: 200,
    bikeWeightLbs: 125,
    ambientTempF: 70,
    tireType: 'road',
    tirePressurePsi: 35,
    targetSpeedMph: 25,
    elevationGainFeet: 0,
    motorEfficiency: 0.82
  });

  const [results, setResults] = useState<{ miles: number; whPerMile: number } | null>(null);

  useEffect(() => {
    // We use the BMS SoC for the calculation if connected, otherwise assume 100%
    const soc = isConnected && bmsData ? bmsData.soc : 100;
    
    // CRITICAL: For range stability, we use the user's NOMINAL voltage (e.g. 60V) 
    // for the capacity calculation, rather than the live sagging voltage.
    const res = calculateRange(inputs, soc);
    
    setResults({ miles: res.miles, whPerMile: res.whPerMile });
  }, [inputs, isConnected, bmsData]);

  const handleInputChange = (key: keyof CalculationInputs, value: any) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="app-container">
      <header>
        <h1>BMS Range Calculator</h1>
        <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.5rem' }}>Standalone Precision Engineering</p>
      </header>

      <div className="dashboard-card">
        <button 
          className="btn-primary" 
          onClick={isConnected ? disconnect : connect}
          disabled={isConnecting}
          style={{ background: isConnected ? '#34a853' : '#ff6600', marginBottom: '1.5rem' }}
        >
          {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Connect Bluetooth BMS'}
        </button>

        {error && <p style={{ color: '#ff4444', fontSize: '0.7rem', textAlign: 'center', marginBottom: '1rem' }}>{error}</p>}
        {getBluetoothErrorMessage() && !isConnected && !isMockMode && (
          <p style={{ color: '#888', fontSize: '0.65rem', textAlign: 'center', marginBottom: '1rem' }}>{getBluetoothErrorMessage()}</p>
        )}

        <div className="stat-grid">
          <div className="stat-item">
            <div className="stat-label">Voltage</div>
            <div className="stat-value">{isConnected && bmsData ? bmsData.voltage.toFixed(1) : inputs.voltage}<span className="stat-unit">V</span></div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Battery SoC</div>
            <div className="stat-value">{isConnected && bmsData ? bmsData.soc.toFixed(0) : '100'}<span className="stat-unit">%</span></div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Current</div>
            <div className="stat-value">{isConnected && bmsData ? bmsData.current.toFixed(1) : '0.0'}<span className="stat-unit">A</span></div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Temp</div>
            <div className="stat-value">{isConnected && bmsData ? bmsData.temp.toFixed(0) : inputs.ambientTempF}<span className="stat-unit">F</span></div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', color: '#444' }}>Testing: {isMockMode ? 'MOCK' : 'LIVE'}</span>
          <button onClick={toggleMockMode} className="btn-secondary" style={{ margin: 0, padding: '0.3rem 0.6rem', width: 'auto', fontSize: '0.6rem' }}>Toggle Mode</button>
        </div>
      </div>

      <div className="form-section">
        <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '1rem', color: '#ff6600' }}>Trip Variables</h3>
        
        <div className="stat-grid">
          <div className="form-group">
            <label>Rider Weight (Lbs)</label>
            <input type="number" value={inputs.riderWeightLbs} onChange={e => handleInputChange('riderWeightLbs', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="form-group">
            <label>Target Speed (Mph)</label>
            <input type="number" value={inputs.targetSpeedMph} onChange={e => handleInputChange('targetSpeedMph', parseFloat(e.target.value) || 0)} />
          </div>
        </div>

        <div className="stat-grid">
          <div className="form-group">
            <label>Elevation Gain (Ft)</label>
            <input type="number" value={inputs.elevationGainFeet} onChange={e => handleInputChange('elevationGainFeet', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="form-group">
            <label>Ambient Temp (F)</label>
            <input type="number" value={inputs.ambientTempF} onChange={e => handleInputChange('ambientTempF', parseFloat(e.target.value) || 0)} />
          </div>
        </div>

        <div className="form-group">
          <label>Tire Type</label>
          <select value={inputs.tireType} onChange={e => handleInputChange('tireType', e.target.value)}>
            <option value="road">Road / Street (Smooth)</option>
            <option value="knobby">Knobby / Off-Road (High Drag)</option>
          </select>
        </div>

        {!isConnected && (
          <div className="form-group" style={{ borderTop: '1px solid #333', paddingTop: '1rem' }}>
            <label>Battery Nominal Voltage</label>
            <input type="number" value={inputs.voltage} onChange={e => handleInputChange('voltage', parseFloat(e.target.value) || 0)} />
          </div>
        )}
      </div>

      {results && (
        <div className="results-card">
          <div className="stat-label" style={{ color: '#fff', fontSize: '0.8rem' }}>Estimated Remaining Range</div>
          <div className="range-value">{results.miles.toFixed(1)}</div>
          <div className="range-unit">Miles</div>
          <div style={{ marginTop: '1rem', fontSize: '0.7rem', color: '#666' }}>
            Efficiency: {results.whPerMile.toFixed(0)} Wh/mi
          </div>
        </div>
      )}

      <footer style={{ marginTop: '3rem', textAlign: 'center', paddingBottom: '2rem' }}>
        <p style={{ color: '#444', fontSize: '0.6rem' }}>(c) 2026 RANGE ANXIETY STANDALONE</p>
      </footer>
    </div>
  );
}

export default App;
