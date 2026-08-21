import React from 'react';

export const NextActionScreen = ({ onBack }) => {
  return (
    <div style={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-cream)', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button className="btn-outline btn-small" style={{ width: '36px', height: '36px', padding: 0 }} onClick={onBack}>←</button>
        <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Next Best Action Plan</h2>
      </div>

      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
        TODAY (HIGH PRIORITY)
      </div>

      <div className="card" style={{ borderLeft: '5px solid var(--color-forest-green)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '16px', fontWeight: '800' }}>Check soil moisture before irrigation</span>
          <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'var(--color-very-light-green)', color: 'var(--color-forest-green)', fontSize: '10px', fontWeight: '700' }}>HIGH</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
          Rain is forecasted tomorrow (60%). Check root zone dampness to prevent waterlogging.
        </p>
        <div style={{ fontSize: '12px', color: 'var(--color-earth-brown)', fontWeight: '600' }}>
          Expected Benefit: Saves 1,200L of water & prevents root rot.
        </div>
      </div>

      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-secondary)', margin: '16px 0 12px 0' }}>
        THIS WEEK
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '16px', fontWeight: '800' }}>Apply Gypsum at Flowering Stage</span>
          <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'var(--color-muted-warning-bg)', color: 'var(--color-muted-warning)', fontSize: '10px', fontWeight: '700' }}>MEDIUM</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
          Apply 200 kg/acre Gypsum near groundnut plant roots for pod strength.
        </p>
        <div style={{ fontSize: '12px', color: 'var(--color-forest-green)', fontWeight: '600' }}>
          Expected Benefit: Increases pod weight & oil content by 15%.
        </div>
      </div>

      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-secondary)', margin: '16px 0 12px 0' }}>
        WATCH FOR
      </div>

      <div className="card card-warm">
        <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--color-earth-brown)', marginBottom: '4px' }}>
          🐛 Early Fungal Leaf Spot Symptoms
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
          High humidity (75%) creates leaf spot risk. Inspect lower foliage every morning.
        </p>
      </div>

    </div>
  );
};
