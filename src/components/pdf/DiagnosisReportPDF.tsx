import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import type { DiagnosisResult, Farm, WeatherData, FarmInsights } from '@/types';

// Register fonts to support Unicode / Indian languages
Font.register({
  family: 'Noto Sans Devanagari',
  src: 'https://fonts.gstatic.com/s/notosansdevanagari/v21/52VzlipO-CUfL8Hk6mC2Z3V-Iu_B_1X0wR1k1-z0fQ.ttf'
});

Font.register({
  family: 'Noto Sans Gujarati',
  src: 'https://fonts.gstatic.com/s/notosansgujarati/v23/8vIQ7wUr0m_hP7g5-G28q39682Oa8t1jU4sQ.ttf'
});

Font.register({
  family: 'Roboto',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf'
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Roboto', // Fallback to Roboto
    backgroundColor: '#ffffff'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#2f855a',
    paddingBottom: 10,
    marginBottom: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2f855a'
  },
  subtitle: {
    fontSize: 10,
    color: '#718096',
    marginTop: 4
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d3748',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
    marginBottom: 8
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 120,
    fontSize: 10,
    color: '#4a5568',
    fontWeight: 'bold'
  },
  value: {
    flex: 1,
    fontSize: 10,
    color: '#2d3748'
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 4
  },
  bullet: {
    width: 15,
    fontSize: 10,
    color: '#4a5568'
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    color: '#2d3748'
  },
  image: {
    width: 200,
    height: 150,
    objectFit: 'cover',
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10
  }
});

interface Props {
  diagnosis: DiagnosisResult;
  farm: Farm;
  weather?: WeatherData | null;
  satelliteImageUrl?: string;
  language: string;
}

const DiagnosisReportPDF: React.FC<Props> = ({ diagnosis, farm, weather, satelliteImageUrl, language }) => {
  // Determine font family based on language for Unicode support
  let fontFamily = 'Roboto';
  if (language === 'hi' || language === 'mr') fontFamily = 'Noto Sans Devanagari';
  if (language === 'gu') fontFamily = 'Noto Sans Gujarati';

  return (
    <Document>
      <Page size="A4" style={[styles.page, { fontFamily }]}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>CROPOCTOR</Text>
            <Text style={styles.subtitle}>Farm Diagnosis Report</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.subtitle}>Date: {new Date(diagnosis.timestamp).toLocaleDateString()}</Text>
            <Text style={styles.subtitle}>ID: {diagnosis.id}</Text>
          </View>
        </View>

        {/* Farm Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Farm Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Farm Name:</Text>
            <Text style={styles.value}>{farm.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Crop:</Text>
            <Text style={styles.value}>{farm.primaryCrop} (Stage: {farm.cropStage})</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.value}>{farm.location.displayName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Soil Type:</Text>
            <Text style={styles.value}>{farm.soilType}</Text>
          </View>
        </View>

        {/* Diagnosis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnosis Result</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Detected Condition:</Text>
            <Text style={styles.value}>{diagnosis.diseaseName || diagnosis.disease}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Severity:</Text>
            <Text style={styles.value}>{diagnosis.severity.toUpperCase()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Certainty:</Text>
            <Text style={styles.value}>{(diagnosis.certainty || 'moderate').toUpperCase()}</Text>
          </View>
          
          {diagnosis.imageUrl && (
             <Image src={diagnosis.imageUrl} style={styles.image} />
          )}
        </View>

        {/* Symptoms / Evidence */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Symptoms & Evidence</Text>
          {diagnosis.symptoms.map((s, i) => (
            <View style={styles.bulletItem} key={i}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{s}</Text>
            </View>
          ))}
        </View>

        {/* Recommended Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended Actions</Text>
          {diagnosis.actions.map((a, i) => (
            <View style={styles.bulletItem} key={i}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{a}</Text>
            </View>
          ))}
        </View>

        {/* Environmental Context */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Environmental Context</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Current Weather:</Text>
            <Text style={styles.value}>
              {weather ? `${weather.temperature}°C, ${weather.description}, Humidity: ${weather.humidity}%` : 'Weather data unavailable'}
            </Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Soil Nutrients:</Text>
            <Text style={styles.value}>Nutrient data unavailable (No soil test found)</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Satellite Status:</Text>
            <Text style={styles.value}>
              {farm.lastNdviObservation ? `NDVI: ${farm.lastNdviObservation.ndvi.value} (${farm.lastNdviObservation.ndvi.label})` : 'Awaiting next satellite observation'}
            </Text>
          </View>
        </View>

        {/* Predictions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prediction & Risk</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Forecast:</Text>
            <Text style={styles.value}>Prediction unavailable due to insufficient historical data.</Text>
          </View>
        </View>
        
        {/* Footer */}
        <View style={{ marginTop: 'auto', paddingTop: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 8, color: '#a0aec0', textAlign: 'center' }}>
            Generated by CROPOCTOR Agricultural Intelligence Platform. This report is based on available data and AI analysis. Always consult an agronomist for critical decisions.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default DiagnosisReportPDF;
