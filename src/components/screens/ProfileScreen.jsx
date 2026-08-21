import React from 'react';
import { ASSETS } from '../../assets/images.js';
import { getLanguage, LANGUAGES } from '../../locales/i18n.js';
import { BRICS_COUNTRIES } from '../../config/countries.js';

export const ProfileScreen = ({ selectedCountryCode, onOpenLanguage, onOpenCountry, onLogout }) => {
  const currentLangCode = getLanguage();
  const langObj = LANGUAGES.find(l => l.code === currentLangCode) || LANGUAGES[0];
  const countryObj = BRICS_COUNTRIES.find(c => c.code === selectedCountryCode) || BRICS_COUNTRIES[0];

  return (
    <div style={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-cream)', overflowY: 'auto' }}>
      
      {/* Profile Card */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-forest-green)' }}>
          <img src={ASSETS.farmerProfile} alt="Farmer Rahul" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-text-primary)' }}>Farmer Rahul</h3>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>rajkotfarmer@gmail.com</div>
          <div style={{ fontSize: '12px', color: 'var(--color-forest-green)', fontWeight: '700', marginTop: '2px' }}>
            🌾 Groundnut • 2.45 acres • Rajkot, Gujarat
          </div>
        </div>
      </div>

      {/* Settings Menu */}
      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
        App Settings & Preferences
      </div>

      <div className="card" style={{ padding: '4px 16px', marginBottom: '20px' }}>
        
        <div onClick={onOpenLanguage} style={{ padding: '14px 0', borderBottom: '1px solid var(--color-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🌐</span>
            <span style={{ fontWeight: '600', fontSize: '15px' }}>Language</span>
          </div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: '600' }}>
            {langObj.nativeName} ({langObj.name}) ›
          </span>
        </div>

        <div onClick={onOpenCountry} style={{ padding: '14px 0', borderBottom: '1px solid var(--color-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>{countryObj.flag}</span>
            <span style={{ fontWeight: '600', fontSize: '15px' }}>Country</span>
          </div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: '600' }}>
            {countryObj.name} ›
          </span>
        </div>

        <div style={{ padding: '14px 0', borderBottom: '1px solid var(--color-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🎙️</span>
            <span style={{ fontWeight: '600', fontSize: '15px' }}>Voice Settings</span>
          </div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: '600' }}>
            Google TTS ›
          </span>
        </div>

        <div style={{ padding: '14px 0', borderBottom: '1px solid var(--color-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>📏</span>
            <span style={{ fontWeight: '600', fontSize: '15px' }}>Units</span>
          </div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: '600' }}>
            Metric (°C, acres) ›
          </span>
        </div>

        <div style={{ padding: '14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>ℹ️</span>
            <span style={{ fontWeight: '600', fontSize: '15px' }}>About Agri AI</span>
          </div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: '600' }}>
            v1.0.0 (Master) ›
          </span>
        </div>

      </div>

      <button className="btn-outline" onClick={onLogout} style={{ color: 'var(--color-muted-danger)', borderColor: 'var(--color-muted-danger-bg)' }}>
        🚪 Logout
      </button>

    </div>
  );
};
