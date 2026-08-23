export interface ServerFarm {
  id: string
  farmerId: string
  name: string
  location: {
    lat: number
    lng: number
    city: string
    state: string
    country: string
    displayName: string
  }
  primaryCrop: string
  soilType: string
  cropStage: string
  area: number
}

// Server-side database of farms with owner farmerId
export const SERVER_FARMS_DB: ServerFarm[] = [
  {
    id: 'farm-001',
    farmerId: 'farmer-001',
    name: 'Rajkot Groundnut Farm',
    location: { lat: 22.3039, lng: 70.8022, city: 'Rajkot', state: 'Gujarat', country: 'India', displayName: 'Rajkot, Gujarat' },
    primaryCrop: 'groundnut',
    soilType: 'loamy',
    cropStage: 'flowering',
    area: 2.45
  },
  {
    id: 'farm-002',
    farmerId: 'farmer-001',
    name: 'Surat Cotton Farm',
    location: { lat: 21.1702, lng: 72.8311, city: 'Surat', state: 'Gujarat', country: 'India', displayName: 'Surat, Gujarat' },
    primaryCrop: 'cotton',
    soilType: 'black',
    cropStage: 'growing',
    area: 3.10
  },
  {
    id: 'farm-003',
    farmerId: 'farmer-002', // Belongs to user 2
    name: 'Junagadh Wheat Farm',
    location: { lat: 21.5222, lng: 70.4579, city: 'Junagadh', state: 'Gujarat', country: 'India', displayName: 'Junagadh, Gujarat' },
    primaryCrop: 'wheat',
    soilType: 'alluvial',
    cropStage: 'seedling',
    area: 1.80
  }
]

export class AssistantTools {
  /**
   * Retrieves all farms owned by the authenticated user.
   * Enforces security: Users can ONLY see their own farms.
   */
  static getUserFarms(userId: string): ServerFarm[] {
    // In dev testing, if userId is test-farmer-001 or farmer-001, return farmer-001's farms
    const normalizedUid = (userId === 'test-farmer-001' || userId === 'dev-user') ? 'farmer-001' : userId
    return SERVER_FARMS_DB.filter(f => f.farmerId === normalizedUid)
  }

  /**
   * Retrieves a single farm by ID and verifies ownership.
   * Throws security error if the farm does not belong to the user.
   */
  static getFarmById(userId: string, farmId: string): ServerFarm {
    const normalizedUid = (userId === 'test-farmer-001' || userId === 'dev-user') ? 'farmer-001' : userId
    const farm = SERVER_FARMS_DB.find(f => f.id === farmId)

    if (!farm) {
      throw new Error(`Farm '${farmId}' not found.`)
    }

    if (farm.farmerId !== normalizedUid) {
      throw new Error(`Permission denied: You do not own farm '${farmId}'.`)
    }

    return farm
  }

  /**
   * Checks if user has permission to access a given farm ID
   */
  static verifyFarmOwnership(userId: string, farmId: string): boolean {
    const normalizedUid = (userId === 'test-farmer-001' || userId === 'dev-user') ? 'farmer-001' : userId
    const farm = SERVER_FARMS_DB.find(f => f.id === farmId)
    return Boolean(farm && farm.farmerId === normalizedUid)
  }
}
