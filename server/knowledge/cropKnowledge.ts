/**
 * Controlled agricultural knowledge layer.
 *
 * Treatment and prevention text shown to farmers comes ONLY from this table — never from
 * free-form model output — so the AI cannot invent chemical names, dosages or safety advice.
 *
 * REVIEW STATUS: every entry below is `unreviewed`. The guidance is deliberately limited to
 * well-established, non-chemical integrated-pest-management practice. Chemical control is
 * referred to the product label and the local extension service (e.g. KVK in India) until an
 * agronomist adds sourced, region-specific product and dose information and sets
 * `reviewStatus: 'reviewed'` with `sources` filled in. Do not add dosages without a source.
 */

export interface KnowledgeEntry {
  immediateActions: string[]
  treatment: string[]
  prevention: string[]
  whenToRecheck: string
  reviewStatus: 'unreviewed' | 'reviewed'
  sources: string[]
}

export const KNOWLEDGE_VERSION = '2026-10-04.1'

const CHEMICAL_REFERRAL =
  'If chemical control is needed, use only a product registered for this crop and disease in your country, at the dose on its label. Confirm the choice with your local agricultural extension officer before spraying.'

const FUNGAL_LEAF_DISEASE: KnowledgeEntry = {
  immediateActions: [
    'Walk the field and estimate what share of plants and leaves show the same symptoms.',
    'Remove and destroy badly affected leaves where practical; do not leave them in the field.',
    'Avoid overhead irrigation and working in the crop while foliage is wet.'
  ],
  treatment: [CHEMICAL_REFERRAL],
  prevention: [
    'Rotate with a non-host crop; avoid planting the same crop in the same field every season.',
    'Remove volunteer plants and crop residue that carry the disease between seasons.',
    'Use tolerant or resistant varieties recommended for your region.',
    'Keep recommended plant spacing so the canopy dries quickly.'
  ],
  whenToRecheck: 'Re-inspect in 5–7 days, or 2 days after rain or heavy dew. Seek expert advice if spots spread to new leaves.',
  reviewStatus: 'unreviewed',
  sources: []
}

const NUTRIENT_STRESS: KnowledgeEntry = {
  immediateActions: [
    'Compare affected plants with healthy ones: note whether symptoms are on old or young leaves.',
    'Check whether the problem follows waterlogged, very dry or sandy patches of the field.'
  ],
  treatment: [
    'Get a soil test before applying fertiliser — visual symptoms alone cannot confirm which nutrient is short.',
    'Apply fertiliser according to soil-test results and local recommendations for the crop stage.'
  ],
  prevention: [
    'Test soil every 2–3 seasons and fertilise to the result.',
    'Add organic matter to improve nutrient-holding capacity.'
  ],
  whenToRecheck: 'Check new leaves 7–10 days after correcting nutrition; new growth should be normal in colour.',
  reviewStatus: 'unreviewed',
  sources: []
}

const PEST_DAMAGE: KnowledgeEntry = {
  immediateActions: [
    'Inspect the underside of leaves and stems for insects, eggs or webbing.',
    'Count affected plants in several parts of the field to judge whether damage is spreading.'
  ],
  treatment: [
    'Act only if pest numbers exceed the local economic threshold — ask your extension officer for the threshold for this crop.',
    CHEMICAL_REFERRAL
  ],
  prevention: [
    'Encourage natural enemies by avoiding unnecessary broad-spectrum sprays.',
    'Remove weeds that host pests around the field.',
    'Use yellow sticky traps or pheromone traps to monitor pest arrival.'
  ],
  whenToRecheck: 'Re-scout in 3–5 days.',
  reviewStatus: 'unreviewed',
  sources: []
}

const VIRAL_DISEASE: KnowledgeEntry = {
  immediateActions: [
    'Mark affected plants and check neighbours for the same symptoms.',
    'Remove and destroy clearly infected plants early to reduce spread.'
  ],
  treatment: [
    'Viral diseases cannot be cured with sprays. Management focuses on controlling the insects that spread the virus — ask your extension officer.'
  ],
  prevention: [
    'Use certified, virus-free seed or seedlings and tolerant varieties.',
    'Control whitefly, aphid or thrips vectors early in the season.',
    'Remove weed hosts around the field.'
  ],
  whenToRecheck: 'Re-inspect in 5–7 days for new symptomatic plants.',
  reviewStatus: 'unreviewed',
  sources: []
}

const HEALTHY: KnowledgeEntry = {
  immediateActions: [],
  treatment: [],
  prevention: [
    'Keep scouting the field weekly so problems are caught early.',
    'Maintain balanced nutrition and irrigation for the crop stage.'
  ],
  whenToRecheck: 'Continue routine weekly scouting.',
  reviewStatus: 'unreviewed',
  sources: []
}

/** Generic, non-specific guidance used when a condition has no dedicated entry. */
const GENERIC: KnowledgeEntry = {
  immediateActions: [
    'Observe whether the symptoms are spreading to new leaves or plants.',
    'Take clear photos of affected and healthy leaves to show an extension officer.'
  ],
  treatment: [
    'Do not apply pesticides until the problem is confirmed. Ask your local agricultural extension officer for a confirmed diagnosis and treatment.'
  ],
  prevention: [
    'Practise crop rotation and remove crop residue after harvest.',
    'Keep recommended plant spacing for good air flow.'
  ],
  whenToRecheck: 'Re-inspect in 3–5 days.',
  reviewStatus: 'unreviewed',
  sources: []
}

const BY_CODE: Record<string, KnowledgeEntry> = {
  'healthy': HEALTHY,
  'rust': FUNGAL_LEAF_DISEASE,
  'early leaf spot': FUNGAL_LEAF_DISEASE,
  'late leaf spot': FUNGAL_LEAF_DISEASE,
  'fungal blight': FUNGAL_LEAF_DISEASE,
  'fungal infection': FUNGAL_LEAF_DISEASE,
  'yellow rust': FUNGAL_LEAF_DISEASE,
  'brown rust': FUNGAL_LEAF_DISEASE,
  'powdery mildew': FUNGAL_LEAF_DISEASE,
  'early blight': FUNGAL_LEAF_DISEASE,
  'late blight': FUNGAL_LEAF_DISEASE,
  'boll rot': FUNGAL_LEAF_DISEASE,
  'nutrient stress': NUTRIENT_STRESS,
  'insect damage': PEST_DAMAGE,
  'pest damage': PEST_DAMAGE,
  'mealybug damage': PEST_DAMAGE,
  'whitefly damage': PEST_DAMAGE,
  'leaf curl virus': VIRAL_DISEASE,
  'viral infection': VIRAL_DISEASE
}

export function getKnowledge(diagnosisCode: string): { entry: KnowledgeEntry; matched: boolean } {
  const entry = BY_CODE[diagnosisCode.trim().toLowerCase()]
  return entry ? { entry, matched: true } : { entry: GENERIC, matched: false }
}

/** Safe verification guidance for INSUFFICIENT_EVIDENCE — never disease-specific. */
export const VERIFICATION_GUIDANCE: string[] = [
  'Retake the photo in daylight, without flash, holding the camera 20–30 cm from the leaf.',
  'Fill the frame with one affected leaf and keep it in sharp focus.',
  'Take a second photo showing both the upper and lower leaf surface.',
  'If symptoms are spreading quickly, show the plant to your local agricultural extension officer.'
]
