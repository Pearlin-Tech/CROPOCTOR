import type { CropOption } from '@/types'

export const CROPS: CropOption[] = [
  // Cereals
  { id: 'rice',      name: 'Rice',      category: 'Cereals',    seasons: ['kharif'] },
  { id: 'wheat',     name: 'Wheat',     category: 'Cereals',    seasons: ['rabi'] },
  { id: 'maize',     name: 'Maize',     category: 'Cereals',    seasons: ['kharif','rabi'] },
  { id: 'barley',    name: 'Barley',    category: 'Cereals',    seasons: ['rabi'] },
  { id: 'sorghum',   name: 'Sorghum',   category: 'Cereals',    seasons: ['kharif'] },
  { id: 'millet',    name: 'Millet',    category: 'Cereals',    seasons: ['kharif'] },
  // Oilseeds
  { id: 'groundnut', name: 'Groundnut', category: 'Oilseeds',   seasons: ['kharif'] },
  { id: 'soybean',   name: 'Soybean',   category: 'Oilseeds',   seasons: ['kharif'] },
  { id: 'mustard',   name: 'Mustard',   category: 'Oilseeds',   seasons: ['rabi'] },
  { id: 'sunflower', name: 'Sunflower', category: 'Oilseeds',   seasons: ['kharif','rabi'] },
  { id: 'sesame',    name: 'Sesame',    category: 'Oilseeds',   seasons: ['kharif'] },
  { id: 'oil-palm',  name: 'Oil Palm',  category: 'Oilseeds' },
  // Pulses
  { id: 'chickpea',  name: 'Chickpea',  category: 'Pulses',     seasons: ['rabi'] },
  { id: 'lentil',    name: 'Lentil',    category: 'Pulses',     seasons: ['rabi'] },
  { id: 'peas',      name: 'Peas',      category: 'Pulses',     seasons: ['rabi'] },
  // Cash Crops
  { id: 'cotton',    name: 'Cotton',    category: 'Cash Crops', seasons: ['kharif'] },
  { id: 'sugarcane', name: 'Sugarcane', category: 'Cash Crops' },
  { id: 'jute',      name: 'Jute',      category: 'Cash Crops', seasons: ['kharif'] },
  { id: 'tobacco',   name: 'Tobacco',   category: 'Cash Crops' },
  // Vegetables
  { id: 'tomato',    name: 'Tomato',    category: 'Vegetables' },
  { id: 'potato',    name: 'Potato',    category: 'Vegetables',  seasons: ['rabi'] },
  { id: 'onion',     name: 'Onion',     category: 'Vegetables' },
  { id: 'chilli',    name: 'Chilli',    category: 'Vegetables', seasons: ['kharif'] },
  { id: 'brinjal',   name: 'Brinjal',   category: 'Vegetables' },
  { id: 'cabbage',   name: 'Cabbage',   category: 'Vegetables',  seasons: ['rabi'] },
  { id: 'cauliflower',name:'Cauliflower',category: 'Vegetables', seasons: ['rabi'] },
  { id: 'carrot',    name: 'Carrot',    category: 'Vegetables',  seasons: ['rabi'] },
  // Fruits
  { id: 'banana',    name: 'Banana',    category: 'Fruits' },
  { id: 'mango',     name: 'Mango',     category: 'Fruits' },
  { id: 'apple',     name: 'Apple',     category: 'Fruits' },
  { id: 'orange',    name: 'Orange',    category: 'Fruits' },
  { id: 'grapes',    name: 'Grapes',    category: 'Fruits' },
  { id: 'papaya',    name: 'Papaya',    category: 'Fruits' },
  { id: 'guava',     name: 'Guava',     category: 'Fruits' },
  { id: 'pomegranate',name:'Pomegranate',category:'Fruits' },
  // Plantation
  { id: 'tea',       name: 'Tea',       category: 'Plantation' },
  { id: 'coffee',    name: 'Coffee',    category: 'Plantation' },
  { id: 'cocoa',     name: 'Cocoa',     category: 'Plantation' },
  { id: 'coconut',   name: 'Coconut',   category: 'Plantation' },
  { id: 'rubber',    name: 'Rubber',    category: 'Plantation' },
  { id: 'cashew',    name: 'Cashew',    category: 'Plantation' },
  { id: 'other',     name: 'Other',     category: 'Other' },
]

export const CROP_CATEGORIES = [...new Set(CROPS.map(c => c.category))]

export const getCrop = (id: string) => CROPS.find(c => c.id === id)
