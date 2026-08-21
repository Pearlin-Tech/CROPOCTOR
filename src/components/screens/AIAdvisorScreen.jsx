import React, { useState } from 'react';
import { AudioPlayer } from '../AudioPlayer.jsx';
import { generateFarmAdvice } from '../../services/aiService.js';
import { getLanguage } from '../../locales/i18n.js';

export const AIAdvisorScreen = ({ activeFarm, onOpenVoiceModal, initialQuestion }) => {
  const [messages, setMessages] = useState([
    {
      id: 'm1',
      sender: 'user',
      text: initialQuestion || 'Should I irrigate my groundnut crop today?'
    },
    {
      id: 'm2',
      sender: 'ai',
      advice: {
        recommendation: getLanguage() === 'gu' ? 'આજે પિયત આપવાનું ૨૪ કલાક માટે ટાળો.' : 'Delay irrigation for 24 hours.',
        why: getLanguage() === 'gu' 
          ? 'રાજકોટ વિસ્તારમાં આવતીકાલે ૬૦-૮૫% વરસાદની સંભાવના છે અને જમીનમાં પર્યાપ્ત ભેજ હાજર છે.'
          : 'Rain is expected tomorrow (60-85% chance) and soil moisture is currently adequate for your Groundnut crop.',
        whatToDo: [
          getLanguage() === 'gu' ? '૧. આવતીકાલે સવારે જમીનનો ભેજ ચકાસો.' : '1. Check soil moisture tomorrow morning.',
          getLanguage() === 'gu' ? '૨. બિનજરૂરી પિયત આપવાનું ટાળો.' : '2. Avoid unnecessary irrigation.',
          getLanguage() === 'gu' ? '૩. વરસાદ પછી ખેતરનું નિરીક્ષણ કરો.' : '3. Monitor the field after rainfall.'
        ],
        dataUsed: ['Weather Forecast (60% Rain)', 'Soil Type (Loamy)', 'Crop Stage (Flowering)', 'Farm Location (Rajkot, Gujarat)']
      }
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const quickQuestions = [
    'Should I irrigate today?',
    'Why are my leaves turning yellow?',
    'Which fertilizer should I use?',
    'When should I sow next season?'
  ];

  const handleSend = async (qText) => {
    const textToSend = qText || inputQuery;
    if (!textToSend || textToSend.trim().length === 0) return;

    const userMsg = { id: `m-${Date.now()}`, sender: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    const advice = await generateFarmAdvice({
      question: textToSend,
      farm: activeFarm,
      language: getLanguage()
    });

    setMessages(prev => [...prev, { id: `m-ai-${Date.now()}`, sender: 'ai', advice }]);
    setLoading(false);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-cream)' }}>
      
      {/* Header */}
      <div style={{ padding: '16px 20px', background: 'var(--color-cream)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>🤖</span>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-forest-green)' }}>Agri AI Advisor</h2>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Your farm-aware agricultural assistant</p>
          </div>
        </div>
      </div>

      {/* Quick Suggestion Chips */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: '8px', overflowX: 'auto', background: 'var(--color-cream)' }}>
        {quickQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-white)',
              border: '1px solid var(--color-pastel-green)',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--color-forest-green)',
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages Feed */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map(msg => {
          if (msg.sender === 'user') {
            return (
              <div key={msg.id} style={{ alignSelf: 'flex-end', maxWidth: '85%', background: 'var(--color-forest-green)', color: 'white', padding: '12px 16px', borderRadius: '18px 18px 4px 18px', fontSize: '14px', fontWeight: '500' }}>
                {msg.text}
              </div>
            );
          } else {
            const { recommendation, why, whatToDo, dataUsed } = msg.advice;
            return (
              <div key={msg.id} className="ai-card" style={{ alignSelf: 'flex-start', width: '100%' }}>
                <div className="ai-card-tag">🌱 AGRI AI RECOMMENDATION</div>
                <div className="ai-card-title">{recommendation}</div>

                <div className="ai-card-section">
                  <div className="ai-card-section-title">WHY</div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>{why}</div>
                </div>

                <div className="ai-card-section">
                  <div className="ai-card-section-title">WHAT TO DO</div>
                  {whatToDo.map((item, idx) => (
                    <div key={idx} style={{ fontSize: '13px', color: 'var(--color-text-primary)', marginTop: '4px' }}>
                      {item}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {dataUsed.map((tag, idx) => (
                    <span key={idx} style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--color-very-light-green)', fontSize: '10px', color: 'var(--color-forest-green)', fontWeight: '600' }}>
                      ✓ {tag}
                    </span>
                  ))}
                </div>

                <AudioPlayer textToRead={`${recommendation}. ${why}`} />
              </div>
            );
          }
        })}

        {loading && (
          <div className="ai-card" style={{ padding: '16px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            🌱 Analyzing weather, soil & groundnut crop stage...
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div style={{ padding: '12px 16px', background: 'var(--color-white)', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button 
          className="header-icon-btn" 
          onClick={onOpenVoiceModal}
          style={{ background: 'var(--color-very-light-green)', color: 'var(--color-forest-green)' }}
          title="Voice Input"
        >
          🎙️
        </button>

        <input 
          type="text"
          className="form-input"
          placeholder="Ask anything about your farm..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-full)' }}
        />

        <button 
          className="btn-primary" 
          onClick={() => handleSend()}
          style={{ width: '42px', height: '42px', borderRadius: '50%', padding: 0 }}
        >
          ➔
        </button>
      </div>

    </div>
  );
};
