// ─── Centralized image configuration ──────────────────────────────────────────
// All image references flow through this file.
// Replace Unsplash URLs with licensed/local assets before production.
// Components NEVER import image URLs directly — always use this config.

const BASE = 'https://images.unsplash.com'

const farm = (id: string, w = 800, h = 600) =>
  `${BASE}/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`

export const IMAGES = {
  // ── Backgrounds / Heroes ───────────────────────────────────────────────────
  logo: '/images/logo.jpg',
  backgrounds: {
    splash:     '/images/splash_bg.jpg',
    welcome:    '/images/welcome_bg.jpg',
    login:      '/images/hero_sunrise_1787238093279.jpg',
    setup:      farm('photo-1560493676-04071c5f467b', 800, 600),
    dashboard:  '/images/dashboard_hero.jpg',
  },

  // ── Farmers ────────────────────────────────────────────────────────────────
  farmers: {
    rahul:      '/images/farmer_profile_1787238107301.jpg',
    profile:    '/images/farmer_profile_1787238107301.jpg',
    farmer1:    '/images/farmer_profile_1787238107301.jpg',
    farmer2:    farm('photo-1559827260-dc66d52bef19', 400, 400),
  },

  // ── Crops ──────────────────────────────────────────────────────────────────
  crops: {
    groundnut:  '/images/crop_leaf_1787238240934.jpg',
    wheat:      farm('photo-1574323347407-f5e1ad6d020b', 400, 300),
    rice:       farm('photo-1536304929831-ee1ca9d44906', 400, 300),
    cotton:     farm('photo-1601004890684-d8cbf643f5f2', 400, 300),
    tomato:     farm('photo-1592841200221-a6898f307baa', 400, 300),
    general:    '/images/crop_leaf_1787238240934.jpg',
  },

  // ── Farms ──────────────────────────────────────────────────────────────────
  farms: {
    rajkot:     farm('photo-1625246333195-78d9c38ad449', 600, 400),
    surat:      farm('photo-1500382017468-9049fed747ef', 600, 400),
    junagarh:   farm('photo-1464226184884-fa280b87c399', 600, 400),
    thumbnail1: farm('photo-1464226184884-fa280b87c399', 200, 150),
    thumbnail2: farm('photo-1625246333195-78d9c38ad449', 200, 150),
    thumbnail3: farm('photo-1560493676-04071c5f467b', 200, 150),
    satellite:  farm('photo-1529927066849-79b791a69825', 600, 400),
  },

  // ── Diagnosis ──────────────────────────────────────────────────────────────
  diagnosis: {
    leafSpot:       '/images/disease_leaf_1787238259522.jpg',
    healthyLeaf:    '/images/crop_leaf_1787238240934.jpg',
    sampleDisease:  '/images/disease_leaf_1787238259522.jpg',
    uploadPlaceholder: farm('photo-1580912534294-6aaee1e0fb33', 400, 400),
  },

  // ── Soil ───────────────────────────────────────────────────────────────────
  soil: {
    loamy:  farm('photo-1591999214041-83dc1c8e1ec6', 400, 300),
    sandy:  farm('photo-1477414348463-c0eb7f1359b6', 400, 300),
    clay:   farm('photo-1523348837708-15d4a09cfac2', 400, 300),
  },

  // ── Icons / Illustrations ──────────────────────────────────────────────────
  illustrations: {
    emptyFarm:  farm('photo-1500382017468-9049fed747ef', 300, 200),
    noData:     farm('photo-1625246333195-78d9c38ad449', 300, 200),
  },

  // ── Fallback ───────────────────────────────────────────────────────────────
  fallback: farm('photo-1500382017468-9049fed747ef', 400, 300),
}

// Helper: get image with fallback
export const getImage = (path: string | undefined, fallback?: string): string =>
  path || fallback || IMAGES.fallback
