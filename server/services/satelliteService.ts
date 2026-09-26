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
      if (process.env.EE_SERVICE_ACCOUNT_JSON) {
        try {
          const keyData = JSON.parse(process.env.EE_SERVICE_ACCOUNT_JSON);
          clientEmail = keyData.client_email;
          privateKey = keyData.private_key;
        } catch (e: any) {
          return reject(new Error(`Failed to parse EE_SERVICE_ACCOUNT_JSON: ${e.message}`));
        }
      } else if (process.env.EE_KEY_PATH) {
        try {
          const keyPath = path.resolve(process.cwd(), process.env.EE_KEY_PATH);
          const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
          clientEmail = keyData.client_email;
          privateKey = keyData.private_key;
        } catch (e: any) {
          return reject(new Error(`Failed to read EE key file: ${e.message}`));
        }
      } else {
        return reject(new Error('Missing Earth Engine credentials (neither EE_SERVICE_ACCOUNT_JSON nor EE_KEY_PATH provided)'));
      }
    }

    if (!clientEmail || !privateKey) {
      return reject(new Error('Earth Engine credentials missing client_email or private_key'));
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

export const getSatelliteDataForFarm = async (farmId: string, lat?: number, lng?: number, boundary?: {lat: number, lng: number}[]): Promise<NDVIResponse> => {
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
      
      let geometryToUse;
      if (boundary && boundary.length >= 3) {
        // Build a polygon if we have at least 3 points
        const coords = boundary.map(pt => [pt.lng, pt.lat]);
        // Close the polygon
        coords.push([boundary[0].lng, boundary[0].lat]);
        geometryToUse = ee.Geometry.Polygon([coords]);
      } else {
        geometryToUse = ee.Geometry.Point([lng, lat]);
      }
      
      // Use Sentinel-2 Surface Reflectance
      const collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(geometryToUse)
        .filterDate(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0])
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
        .sort('system:time_start', false); // Most recent first
      
      const latestImage = collection.first();

      // Compute NDVI: (NIR - Red) / (NIR + Red) for Sentinel-2 is (B8 - B4) / (B8 + B4)
      const ndviImage = latestImage.normalizedDifference(['B8', 'B4']).rename('NDVI');

      // 1. Extract numerical NDVI value at the coordinate/polygon
      const ndviDict = ndviImage.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: geometryToUse,
        scale: 10, // Sentinel-2 resolution
        maxPixels: 1e9
      });

      // 2. Generate a visual thumbnail centered on the farm
      const visParams = { 
        min: 0.0, 
        max: 1.0, 
        palette: ['FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718', '74A901', '66A000', '529400', '3E8601', '207401', '056201', '004C00', '023B01', '012E01', '011D01', '011301'] 
      };

      // Buffer of ~300 meters for a tighter visual context and higher relative resolution
      const region = geometryToUse.buffer(300);

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

        // Generate True Color (RGB) composite using Sentinel-2 bands B4 (Red), B3 (Green), B2 (Blue)
        const trueColorImage = latestImage.visualize({
          bands: ['B4', 'B3', 'B2'],
          min: 0,
          max: 3000
        });

        // Use a much larger buffer (1000m) to get a wider context and avoid extreme pixelation
        // Evaluate the geometry locally to a GeoJSON representation before requesting the URL
        const bufferGeo = point.buffer(1000);
        bufferGeo.evaluate((regionData: any, geoError: any) => {
          if (geoError) return reject(new Error(`GEE Geometry Error: ${geoError}`));
          
          console.log('Evaluated Region Data:', JSON.stringify(regionData));
          
          trueColorImage.getThumbURL({
            dimensions: 1024,
            region: regionData,
            format: 'png'
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
      });
    } catch (e: any) {
      reject(new Error(`GEE Execution Error: ${e.message}`));
    }
  });
};
