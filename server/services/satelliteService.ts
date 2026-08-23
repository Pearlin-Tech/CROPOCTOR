import ee from '@google/earthengine';
import fs from 'fs';
import path from 'path';

/**
 * satelliteService.ts
 * 
 * Google Earth Engine Remote Sensing Integration
 * Returns real NDVI extraction and thumbnail imagery from Landsat.
 */

export interface NDVIResponse {
  farmId: string;
  latitude?: number;
  longitude?: number;
  ndvi: {
    value: number;
    label: string;
  };
  satelliteImageUrl: string;
  source: string;
}

let isEEInitialized = false;

const authenticateEE = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isEEInitialized) return resolve();

    let clientEmail = process.env.EE_CLIENT_EMAIL;
    let privateKey = process.env.EE_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
      if (process.env.EE_KEY_PATH) {
        try {
          const keyPath = path.resolve(process.cwd(), process.env.EE_KEY_PATH);
          const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
          clientEmail = keyData.client_email;
          privateKey = keyData.private_key;
        } catch (e: any) {
          return reject(new Error(`Failed to read EE key file: ${e.message}`));
        }
      } else {
        return reject(new Error('Missing Earth Engine credentials (neither EE_PRIVATE_KEY nor EE_KEY_PATH provided)'));
      }
    }

    if (!clientEmail || !privateKey) {
      return reject(new Error('Earth Engine credentials file missing client_email or private_key'));
    }

    privateKey = privateKey.replace(/\\n/g, '\n');
    
    ee.data.authenticateViaPrivateKey(
      {
        client_email: clientEmail,
        private_key: privateKey
      },
      () => {
        ee.initialize(null, null, () => {
          isEEInitialized = true;
          resolve();
        }, (e: any) => reject(new Error(`EE init error: ${e}`)));
      },
      (e: any) => reject(new Error(`EE auth error: ${e}`))
    );
  });
};

const getNDVILabel = (value: number): string => {
  if (value < 0.2) return 'Poor Vegetation';
  if (value < 0.4) return 'Fair Vegetation';
  if (value < 0.6) return 'Good Vegetation';
  return 'Excellent Vegetation';
};

export const getSatelliteDataForFarm = async (farmId: string, lat?: number, lng?: number): Promise<NDVIResponse> => {
  if (!lat || !lng) {
    throw new Error("Latitude and longitude are required for real satellite data");
  }

  try {
    await authenticateEE();
  } catch (error: any) {
    console.error("[GEE Auth Error]:", error);
    throw new Error(`Earth Engine Authentication Failed: ${error.message}`);
  }

  return new Promise((resolve, reject) => {
    try {
      // Calculate 6 month window
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);
      
      const point = ee.Geometry.Point([lng, lat]);
      
      // Use Sentinel-2 Surface Reflectance
      const collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(point)
        .filterDate(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0])
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
        .sort('system:time_start', false); // Most recent first
      
      const latestImage = collection.first();

      // Compute NDVI: (NIR - Red) / (NIR + Red) for Sentinel-2 is (B8 - B4) / (B8 + B4)
      const ndviImage = latestImage.normalizedDifference(['B8', 'B4']).rename('NDVI');

      // 1. Extract numerical NDVI value at the coordinate
      const ndviDict = ndviImage.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: point,
        scale: 10, // Sentinel-2 resolution
        maxPixels: 1e9
      });

      // 2. Generate a visual thumbnail centered on the farm
      const visParams = { 
        min: 0.0, 
        max: 1.0, 
        palette: ['FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718', '74A901', '66A000', '529400', '3E8601', '207401', '056201', '004C00', '023B01', '012E01', '011D01', '011301'] 
      };

      // Buffer of ~500 meters for a good visual context
      const region = point.buffer(500);

      // Evaluate the numerical value
      ndviDict.evaluate((result: any, evalError: any) => {
        if (evalError) {
          if (evalError.toString().includes("Image.normalizedDifference: Parameter 'image' is required") || 
              evalError.toString().includes("Image.reduceRegion: Parameter 'image' is required")) {
             return reject(new Error('No clear Sentinel-2 imagery available for this location in the past 6 months.'));
          }
          return reject(new Error(`GEE Evaluation Error: ${evalError}`));
        }
        
        if (!result || typeof result.NDVI !== 'number') {
          return reject(new Error('No usable NDVI data available for this specific coordinate in the most recent clear image.'));
        }

        const rawNdvi = result.NDVI;
        const normalizedNdvi = Number(rawNdvi.toFixed(2)); // Clean precision

        // Generate thumbnail URL using the NDVI image
        ndviImage.getThumbURL({
          dimensions: 800,
          region: region,
          ...visParams
        }, (url: string, thumbError: any) => {
          if (thumbError) return reject(new Error(`GEE Thumbnail Error: ${thumbError}`));

          resolve({
            farmId,
            latitude: lat,
            longitude: lng,
            ndvi: {
              value: normalizedNdvi,
              label: getNDVILabel(normalizedNdvi)
            },
            satelliteImageUrl: url,
            source: "earth-engine"
          });
        });
      });
    } catch (e: any) {
      reject(new Error(`GEE Execution Error: ${e.message}`));
    }
  });
};
