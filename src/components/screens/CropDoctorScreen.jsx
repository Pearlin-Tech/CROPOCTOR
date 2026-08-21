import React, { useState } from 'react';
import { ASSETS } from '../../assets/images.js';
import { diagnoseCropImage } from '../../services/diagnosisService.js';
import { AudioPlayer } from '../AudioPlayer.jsx';

export const CropDoctorScreen = ({ onAskAiFollowUp }) => {
  const [selectedImage, setSelectedImage] = useState(ASSETS.leafSpotSample);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [diagnosisResult, setDiagnosisResult] = useState(null);

  const scanSteps = [
    'Examining crop leaf image...',
    'Identifying crop species (Groundnut)...',
    'Checking visual symptom patterns...',
    'Analyzing leaf spot severity...',
    'Preparing recommendation...'
  ];

  const handleRunDiagnosis = (imgSrc) => {
    setSelectedImage(imgSrc);
    setDiagnosisResult(null);
    setIsScanning(true);
    setScanStepIndex(0);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < scanSteps.length) {
        setScanStepIndex(step);
      } else {
        clearInterval(interval);
        diagnoseCropImage(imgSrc).then(res => {
          setIsScanning(false);
          setDiagnosisResult(res);
        });
      }
    }, 500);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      handleRunDiagnosis(url);
    }
  };

  return (
    <div style={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-cream)', overflowY: 'auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-forest-green)' }}>Crop Doctor</h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Take a photo of your crop leaf or upload one for AI diagnosis.
        </p>
      </div>

      {/* Image Preview / Scanner Box */}
      <div className="scanner-container" style={{ marginBottom: '16px' }}>
        <img src={selectedImage} alt="Crop Leaf" className="scanner-image" />
        {isScanning && <div className="scanner-line" />}
      </div>

      {/* Action Buttons */}
      {!isScanning && !diagnosisResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <label className="btn-primary" style={{ flex: 1, margin: 0, cursor: 'pointer' }}>
              📷 Take Photo
              <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>

            <label className="btn-outline" style={{ flex: 1, margin: 0, cursor: 'pointer' }}>
              🖼️ Upload Image
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>
          </div>

          <button 
            className="btn-secondary" 
            onClick={() => handleRunDiagnosis(ASSETS.leafSpotSample)}
            style={{ fontWeight: '700' }}
          >
            🍃 Use Sample Image (Leaf Spot Demo)
          </button>
        </div>
      )}

      {/* Scanning Loading State */}
      {isScanning && (
        <div className="card card-pastel" style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px', animation: 'spin 2s infinite linear' }}>🔍</div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-forest-green)', marginBottom: '4px' }}>
            {scanSteps[scanStepIndex]}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Gemini Multimodal Vision Model analyzing visual symptoms
          </p>
        </div>
      )}

      {/* Diagnosis Result View */}
      {diagnosisResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ border: '2px solid var(--color-pastel-green)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ padding: '4px 10px', borderRadius: '9999px', background: 'var(--color-muted-danger-bg)', color: 'var(--color-muted-danger)', fontWeight: '700', fontSize: '11px' }}>
                DISEASE DETECTED
              </span>
              <span style={{ padding: '4px 10px', borderRadius: '9999px', background: 'var(--color-very-light-green)', color: 'var(--color-forest-green)', fontWeight: '700', fontSize: '11px' }}>
                🎯 {diagnosisResult.confidence}% Match
              </span>
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              {diagnosisResult.diseaseName}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
              Crop Identified: <strong>{diagnosisResult.cropIdentified}</strong>
            </p>

            {/* Observed Symptoms */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-earth-brown)', letterSpacing: '0.5px', marginBottom: '4px' }}>
                OBSERVED SYMPTOMS
              </div>
              {diagnosisResult.observedSymptoms.map((sym, idx) => (
                <div key={idx} style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  • {sym}
                </div>
              ))}
            </div>

            {/* Recommended Actions */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-forest-green)', letterSpacing: '0.5px', marginBottom: '4px' }}>
                RECOMMENDED ACTIONS
              </div>
              {diagnosisResult.recommendedActions.map((act, idx) => (
                <div key={idx} style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: '500', marginTop: '4px' }}>
                  {idx + 1}. {act}
                </div>
              ))}
            </div>

            <AudioPlayer textToRead={`${diagnosisResult.diseaseName}. ${diagnosisResult.observedSymptoms.join('. ')}`} />

            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--color-border)', fontSize: '10px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              ⚠️ {diagnosisResult.disclaimer}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-primary" onClick={() => onAskAiFollowUp('How do I treat leaf spot on groundnut organically?')}>
              🤖 Ask AI Treatment
            </button>
            <button className="btn-outline" onClick={() => setDiagnosisResult(null)}>
              🔄 Diagnose Another
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
