import React, { useState } from 'react';
import { ASSETS } from '../../assets/images.js';

export const InsightsScreen = ({ activeFarm, onBack }) => {
  const [activeTab, setActiveTab] = useState('satellite');

  return (
    <div style={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-cream)', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button className="btn-outline btn-small" style={{ width: '36px', height: '36px', padding: 0 }} onClick={onBack}>←</button>
        <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Farm Insights</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', background: 'var(--color-white)', padding: '4px', borderRadius: '14px', border: '1px solid var(--color-border)', marginBottom: '16px' }}>
        <button 
          onClick={() => setActiveTab('crop')}
          style={{ flex: 1, padding: '8px', borderRadius: '10px', border: 'none', background: activeTab === 'crop' ? 'var(--color-forest-green)' : 'transparent', color: activeTab === 'crop' ? 'white' : 'var(--color-text-muted)', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
        >
          Crop Health
        </button>
        <button 
          onClick={() => setActiveTab('soil')}
          style={{ flex: 1, padding: '8px', borderRadius: '10px', border: 'none', background: activeTab === 'soil' ? 'var(--color-forest-green)' : 'transparent', color: activeTab === 'soil' ? 'white' : 'var(--color-text-muted)', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
        >
          Soil Health
        </button>
        <button 
          onClick={() => setActiveTab('satellite')}
          style={{ flex: 1, padding: '8px', borderRadius: '10px', border: 'none', background: activeTab === 'satellite' ? 'var(--color-forest-green)' : 'transparent', color: activeTab === 'satellite' ? 'white' : 'var(--color-text-muted)', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
        >
          Satellite
        </button>
      </div>

      {/* Satellite Imagery View */}
      <div className="card" style={{ padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800' }}>{activeFarm?.name || 'Rajkot Groundnut Farm'}</h3>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>NDVI Vegetation Index</div>
          </div>
          <span style={{ padding: '4px 10px', borderRadius: '9999px', background: 'var(--color-very-light-green)', color: 'var(--color-forest-green)', fontWeight: '700', fontSize: '11px' }}>
            ● LIVE DEMO DATA
          </span>
        </div>

        <div style={{ position: 'relative', width: '100%', height: '220px', borderRadius: '16px', overflow: 'hidden', marginBottom: '14px' }}>
          <img src={ASSETS.satelliteFarm} alt="Satellite Farm Overlay" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            <polygon points="50,40 280,30 320,180 80,190" fill="rgba(102,184,106,0.35)" stroke="#66B86A" strokeWidth="3" strokeDasharray="4" />
          </svg>
        </div>

        {/* NDVI Gauge Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
            <span>NDVI Score: <strong style={{ color: 'var(--color-forest-green)' }}>0.72</strong></span>
            <span style={{ color: 'var(--color-forest-green)' }}>Good / Healthy</span>
          </div>
          <div style={{ height: '10px', borderRadius: '5px', background: 'linear-gradient(90deg, #D8A84E 0%, #A8D5A2 50%, #2E7D32 100%)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-4px', left: '72%', width: '6px', height: '18px', background: '#111', borderRadius: '3px' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            <span>Poor (0.2)</span>
            <span>Moderate (0.5)</span>
            <span>Excellent (0.9)</span>
          </div>
        </div>
      </div>

      {/* Health Breakdown */}
      <div className="card card-pastel" style={{ marginTop: '12px' }}>
        <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-forest-green)', marginBottom: '8px' }}>
          Key Contributing Factors
        </h4>
        <div style={{ fontSize: '13px', color: 'var(--color-text-primary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div>🌱 <strong>Crop Canopy Density:</strong> 85% coverage</div>
          <div>💧 <strong>Root Zone Moisture:</strong> Adequate (68%)</div>
          <div>☀️ <strong>Photosynthetic Activity:</strong> Strong</div>
        </div>
      </div>

    </div>
  );
};
