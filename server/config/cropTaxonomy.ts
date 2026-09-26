export const CROP_TAXONOMY: Record<string, string[]> = {
  Groundnut: [
    'rust',
    'early leaf spot',
    'late leaf spot',
    'fungal blight',
    'nutrient stress',
    'insect damage',
    'healthy',
    'insufficient evidence'
  ],
  Cotton: [
    'boll rot',
    'leaf curl virus',
    'mealybug damage',
    'whitefly damage',
    'nutrient stress',
    'healthy',
    'insufficient evidence'
  ],
  Wheat: [
    'yellow rust',
    'brown rust',
    'powdery mildew',
    'smut',
    'nutrient stress',
    'healthy',
    'insufficient evidence'
  ],
  Tomato: [
    'late blight',
    'early blight',
    'leaf curl virus',
    'blossom end rot',
    'nutrient stress',
    'healthy',
    'insufficient evidence'
  ],
  default: [
    'fungal infection',
    'bacterial infection',
    'viral infection',
    'nutrient stress',
    'pest damage',
    'environmental stress',
    'healthy',
    'insufficient evidence'
  ]
};

export function getTaxonomyForCrop(crop?: string): string[] {
  if (!crop) return CROP_TAXONOMY.default;
  const normalizedCrop = crop.trim();
  // case insensitive match
  const key = Object.keys(CROP_TAXONOMY).find(k => k.toLowerCase() === normalizedCrop.toLowerCase());
  return key ? CROP_TAXONOMY[key] : CROP_TAXONOMY.default;
}
