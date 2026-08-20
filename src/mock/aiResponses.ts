import type { AIMessage } from '@/types'

export const MOCK_AI_RESPONSES: Record<string, AIMessage> = {
  irrigation: {
    id: 'ai-001',
    role: 'assistant',
    timestamp: new Date().toISOString(),
    content: 'Based on your farm data, I recommend delaying irrigation for 24 hours.',
    structured: {
      recommendation: 'Delay irrigation for 24 hours.',
      why: 'Rain is expected tomorrow and current soil moisture levels are adequate for your groundnut crop at flowering stage. Over-irrigation at this stage can cause root diseases and flower drop.',
      whatToDo: [
        'Check soil moisture tomorrow morning before deciding.',
        'Avoid any irrigation today.',
        'Monitor the field for water pooling after rain.',
        'If rain is less than 20mm, irrigate lightly the day after.',
      ],
      dataUsed: ['Weather forecast', 'Soil type (Loamy)', 'Crop stage (Flowering)', 'Farm location'],
    },
  },
  yellowing: {
    id: 'ai-002',
    role: 'assistant',
    timestamp: new Date().toISOString(),
    content: 'Yellow leaves in groundnut at flowering stage often indicate a nutrient issue.',
    structured: {
      recommendation: 'Apply foliar spray of iron + zinc micronutrients.',
      why: 'Interveinal yellowing (green veins, yellow between) in groundnut at flowering stage typically indicates iron or manganese deficiency, which is common in Rajkot\'s loamy soil at this pH.',
      whatToDo: [
        'Inspect 5–10 plants across the field for leaf pattern.',
        'Apply 0.5% ferrous sulphate foliar spray in the morning.',
        'Check irrigation water source for high bicarbonates.',
        'Repeat application after 10 days if yellowing persists.',
      ],
      dataUsed: ['Crop (Groundnut)', 'Crop stage (Flowering)', 'Soil type (Loamy)', 'Region (Rajkot)'],
    },
  },
  sowing: {
    id: 'ai-003',
    role: 'assistant',
    timestamp: new Date().toISOString(),
    content: 'Based on your location and soil, groundnut sowing window is typically June–July.',
    structured: {
      recommendation: 'Sow groundnut between June 10 and July 5 for optimal yield.',
      why: 'Rajkot receives the southwest monsoon in early June. Groundnut in loamy soil needs 500–600mm of rainfall during the growing season. Early sowing captures the full monsoon window.',
      whatToDo: [
        'Prepare seed beds after the first 50mm monsoon rain.',
        'Use certified groundnut varieties suited to Gujarat (GG-20, GJG-22).',
        'Treat seeds with Rhizobium culture before sowing.',
        'Maintain 30cm row spacing and 10cm plant spacing.',
      ],
      dataUsed: ['Location (Rajkot)', 'Soil type (Loamy)', 'Weather (Monsoon forecast)', 'Crop (Groundnut)'],
    },
  },
  general: {
    id: 'ai-004',
    role: 'assistant',
    timestamp: new Date().toISOString(),
    content: 'Your groundnut farm looks healthy. Here is what I recommend for today.',
    structured: {
      recommendation: 'Monitor lower leaves and prepare for post-rain field inspection.',
      why: 'With rain expected tomorrow and the crop at flowering stage, the next 48 hours are important for disease monitoring and soil management.',
      whatToDo: [
        'Walk the field today and check for any early disease signs.',
        'Ensure drainage channels are clear before rain arrives.',
        'Hold any fertilizer application until after the rain.',
        'Photograph any unusual leaf symptoms for AI diagnosis.',
      ],
      dataUsed: ['Weather forecast', 'Crop stage (Flowering)', 'Farm health (82%)', 'Historical alerts'],
    },
  },
}

export const QUICK_QUESTIONS = [
  'Should I irrigate today?',
  'Why are my leaves turning yellow?',
  'When should I sow?',
  'Which fertilizer should I use?',
  'Is rain expected at the right time?',
  'How can I improve crop health?',
]

export const getMockAIResponse = (question: string): AIMessage => {
  const q = question.toLowerCase()
  if (q.includes('irrigat') || q.includes('water')) return MOCK_AI_RESPONSES.irrigation
  if (q.includes('yellow') || q.includes('leaves') || q.includes('colour')) return MOCK_AI_RESPONSES.yellowing
  if (q.includes('sow') || q.includes('plant') || q.includes('when')) return MOCK_AI_RESPONSES.sowing
  return MOCK_AI_RESPONSES.general
}
