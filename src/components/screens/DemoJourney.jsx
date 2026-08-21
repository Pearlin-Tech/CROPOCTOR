import React from 'react';

export const DemoJourney = ({ onRunStep, onClose }) => {
  const demoSteps = [
    { label: '1. Select Gujarati Language', action: () => onRunStep('language', 'gu') },
    { label: '2. Select India 🇮🇳', action: () => onRunStep('country', 'IN') },
    { label: '3. Login & Open Dashboard', action: () => onRunStep('dashboard') },
    { label: '4. Open AI Advisor', action: () => onRunStep('aiAdvisor', 'શું મારે આજે પિયત આપવું જોઈએ?') },
    { label: '5. Run Crop Doctor Diagnosis', action: () => onRunStep('diagnose') },
    { label: '6. Open Satellite Insights', action: () => onRunStep('insights') },
    { label: '7. Open Weather Intelligence', action: () => onRunStep('weather') },
    { label: '8. Switch to English', action: () => onRunStep('language', 'en') }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-forest-green)' }}>
              🚀 Hackathon Demo Tour Guide
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              1-Click shortcut steps to demonstrate key prompt flows
            </p>
          </div>
          <button className="btn-outline btn-small" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {demoSteps.map((step, idx) => (
            <button
              key={idx}
              className="btn-secondary"
              onClick={() => {
                step.action();
                onClose();
              }}
              style={{ justifyContent: 'flex-start', padding: '12px 16px', fontSize: '14px' }}
            >
              {step.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
