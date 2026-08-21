import React from 'react';
import { getWeatherForecast } from '../../services/weatherService.js';

export const WeatherScreen = ({ onBack }) => {
  const weather = getWeatherForecast();

  return (
    <div style={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-cream)', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button className="btn-outline btn-small" style={{ width: '36px', height: '36px', padding: 0 }} onClick={onBack}>←</button>
        <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Weather Intelligence</h2>
      </div>

      {/* Main Weather Card */}
      <div className="weather-card" style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', opacity: 0.9 }}>📍 {weather.locationName}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0' }}>
          <div>
            <div style={{ fontSize: '42px', fontWeight: '800' }}>{weather.current.temp}°C</div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>{weather.current.condition}</div>
          </div>
          <span style={{ fontSize: '56px' }}>{weather.current.icon}</span>
        </div>
        <div className="weather-metrics">
          <div>Rain: <strong>{weather.current.rainProb}%</strong></div>
          <div>Humidity: <strong>{weather.current.humidity}%</strong></div>
          <div>Wind: <strong>{weather.current.windSpeed} km/h</strong></div>
          <div>UV: <strong>{weather.current.uvIndex}</strong></div>
        </div>
      </div>

      {/* 7-Day Forecast Row */}
      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
        7-Day Forecast
      </div>
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '6px' }}>
        {weather.weekly.map((w, idx) => (
          <div
            key={idx}
            style={{
              minWidth: '70px',
              padding: '12px 8px',
              borderRadius: '16px',
              background: idx === 0 ? 'var(--color-very-light-green)' : 'var(--color-white)',
              border: idx === 0 ? '2px solid var(--color-forest-green)' : '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              textAlign: 'center'
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: '700' }}>{w.day}</span>
            <span style={{ fontSize: '24px' }}>{w.icon}</span>
            <span style={{ fontSize: '14px', fontWeight: '800' }}>{w.temp}°</span>
            <span style={{ fontSize: '10px', color: 'var(--color-info-blue)', fontWeight: '600' }}>💧{w.rain}%</span>
          </div>
        ))}
      </div>

      {/* Farm Impact Section */}
      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
        Agricultural Farm Impact
      </div>

      <div className="card" style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontWeight: '700', fontSize: '15px' }}>💧 Irrigation Recommendation</span>
          <span style={{ padding: '4px 10px', borderRadius: '9999px', background: 'var(--color-muted-warning-bg)', color: weather.farmImpact.irrigation.statusColor, fontWeight: '700', fontSize: '12px' }}>
            {weather.farmImpact.irrigation.action}
          </span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {weather.farmImpact.irrigation.recommendation}
        </p>
      </div>

      <div className="card" style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontWeight: '700', fontSize: '15px' }}>🧪 Chemical Spraying</span>
          <span style={{ padding: '4px 10px', borderRadius: '9999px', background: 'var(--color-muted-warning-bg)', color: weather.farmImpact.spraying.statusColor, fontWeight: '700', fontSize: '12px' }}>
            {weather.farmImpact.spraying.action}
          </span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {weather.farmImpact.spraying.recommendation}
        </p>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontWeight: '700', fontSize: '15px' }}>🦠 Disease Risk</span>
          <span style={{ padding: '4px 10px', borderRadius: '9999px', background: 'var(--color-muted-danger-bg)', color: weather.farmImpact.diseaseRisk.statusColor, fontWeight: '700', fontSize: '12px' }}>
            {weather.farmImpact.diseaseRisk.level}
          </span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {weather.farmImpact.diseaseRisk.recommendation}
        </p>
      </div>

    </div>
  );
};
