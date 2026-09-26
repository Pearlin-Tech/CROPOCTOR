import { analyzeCropWithGeminiModule } from '../server/services/geminiDiagnosisModule';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

async function runTest() {
  console.log('Starting reproducibility test...');
  
  const imagePath = path.join(process.cwd(), 'public/images/disease_leaf_1787238259522.jpg');
  if (!fs.existsSync(imagePath)) {
    console.error('Image not found:', imagePath);
    return;
  }
  
  const buffer = fs.readFileSync(imagePath);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  console.log(`Image SHA-256: ${hash}`);
  
  const base64 = buffer.toString('base64');
  
  const results = [];
  const RUNS = 5;
  
  for (let i = 0; i < RUNS; i++) {
    console.log(`\nRun ${i + 1}/${RUNS}...`);
    const result = await analyzeCropWithGeminiModule({
      imageBase64: base64,
      mimeType: 'image/jpeg',
      farmContext: {
        crop: 'Groundnut'
      }
    });
    
    if (result.success && result.data) {
      console.log(`Diagnosis: ${result.data.diseaseName}`);
      console.log(`Confidence: ${result.data.confidence}%`);
      results.push(result.data.diseaseName);
    } else {
      console.error('Error:', result.error);
    }
    
    // Add small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('\n--- Summary ---');
  const uniqueDiagnoses = [...new Set(results)];
  console.log(`Unique diagnoses: ${uniqueDiagnoses.length}`);
  console.log(uniqueDiagnoses.join(' | '));
}

runTest();
