export interface NDVIResult {
  farmId: string;
  latitude?: number;
  longitude?: number;
  ndvi: {
    value: number;
    label: string;
  };
  satelliteImageUrl: string;
  source: string;
  errorDetails?: string;
}

export const satelliteService = {
  /**
   * Fetch satellite and NDVI data for a given farm.
   */
  getSatelliteData: async (farmId: string, lat?: number, lng?: number): Promise<NDVIResult> => {
    try {
      const queryParams = new URLSearchParams();
      if (lat !== undefined) queryParams.append('lat', lat.toString());
      if (lng !== undefined) queryParams.append('lng', lng.toString());
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await fetch(`/api/farms/${farmId}/satellite${queryString}`);
      
      let json;
      try {
        json = await response.json();
      } catch (e) {
        // Not JSON
      }

      if (!response.ok) {
        throw new Error(json?.error || `Failed to fetch satellite data: ${response.statusText}`);
      }
      
      if (json?.success && json?.data) {
        return json.data;
      } else {
        throw new Error(json?.error || 'Invalid satellite data response');
      }
    } catch (error) {
      console.error('[satelliteService] Error fetching satellite data:', error);
      // Provide safe fallback so UI doesn't crash completely, but pass the detailed error
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        farmId,
        latitude: lat,
        longitude: lng,
        ndvi: {
          value: 0,
          label: 'Data Unavailable'
        },
        satelliteImageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
        source: "error",
        errorDetails: errorMsg
      };
    }
  }
};
