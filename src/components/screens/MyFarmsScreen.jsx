import React from 'react';
import { getFarms, setActiveFarmId, getActiveFarm } from '../../services/farmService.js';

export const MyFarmsScreen = ({ onAddFarm, onSelectFarm }) => {
  const farms = getFarms();
  const active = getActiveFarm();

  return (
    <div style={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-cream)', overflowY: 'auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-forest-green)' }}>My Farms</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Manage your registered farm properties</p>
        </div>

        <button className="btn-primary btn-small" onClick={onAddFarm} style={{ width: 'auto' }}>
          + Add Farm
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
        {farms.map(f => {
          const isSelected = active?.id === f.id;
          return (
            <div
              key={f.id}
              onClick={() => {
                setActiveFarmId(f.id);
                onSelectFarm(f);
              }}
              className="card"
              style={{
                display: 'flex',
                gap: '14px',
                alignItems: 'center',
                padding: '14px',
                cursor: 'pointer',
                border: isSelected ? '2px solid var(--color-forest-green)' : '1px solid var(--color-border)',
                background: isSelected ? 'linear-gradient(135deg, var(--color-very-light-green) 0%, var(--color-white) 100%)' : 'var(--color-white)'
              }}
            >
              <div style={{ width: '70px', height: '70px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0 }}>
                <img src={f.image} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-text-primary)' }}>{f.name}</h3>
                  {isSelected && <span style={{ color: 'var(--color-forest-green)', fontWeight: '800', fontSize: '12px' }}>● Active</span>}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0' }}>
                  📍 {f.location}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--color-very-light-green)', color: 'var(--color-forest-green)', fontSize: '11px', fontWeight: '700' }}>
                    {f.crop} • {f.area} acres
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: '600' }}>
                    {f.healthScore}% Healthy
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
