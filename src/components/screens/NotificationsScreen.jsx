import React, { useState } from 'react';
import { getNotifications, markAllRead } from '../../services/notificationService.js';

export const NotificationsScreen = ({ onBack }) => {
  const [items, setItems] = useState(getNotifications());

  const handleMarkAllRead = () => {
    markAllRead();
    setItems([...getNotifications()]);
  };

  return (
    <div style={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-cream)', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-outline btn-small" style={{ width: '36px', height: '36px', padding: 0 }} onClick={onBack}>←</button>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Notifications</h2>
        </div>
        <button className="btn-outline btn-small" onClick={handleMarkAllRead}>
          Mark All Read
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map(n => (
          <div
            key={n.id}
            className="card"
            style={{
              padding: '14px',
              borderLeft: n.priority === 'High' ? '4px solid var(--color-muted-danger)' : '4px solid var(--color-forest-green)',
              background: n.unread ? 'var(--color-white)' : 'var(--color-off-white)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '18px' }}>{n.icon}</span>
                <span style={{ fontWeight: '800', fontSize: '15px', color: 'var(--color-text-primary)' }}>{n.title}</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{n.time}</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
              {n.message}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
};
