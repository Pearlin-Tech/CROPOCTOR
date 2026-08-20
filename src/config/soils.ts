import type { SoilOption } from '@/types'

export const SOILS: SoilOption[] = [
  { id: 'sandy',    name: 'Sandy',      description: 'Light, fast-draining soil with low nutrient retention.' },
  { id: 'loamy',    name: 'Loamy',      description: 'Balanced mix of sand, silt and clay — ideal for most crops.' },
  { id: 'clay',     name: 'Clay',       description: 'Heavy soil that retains water and nutrients well.' },
  { id: 'silty',    name: 'Silty',      description: 'Fertile and moisture-retaining, prone to compaction.' },
  { id: 'black',    name: 'Black Soil', description: 'Rich in moisture and ideal for cotton and cereals.' },
  { id: 'red',      name: 'Red Soil',   description: 'Well-drained, slightly acidic, common in tropical regions.' },
  { id: 'alluvial', name: 'Alluvial',   description: 'Highly fertile soil deposited by rivers.' },
  { id: 'laterite', name: 'Laterite',   description: 'Acidic, iron-rich soil found in tropical highlands.' },
  { id: 'peaty',    name: 'Peaty',      description: 'Dark, organic-rich soil with high water retention.' },
  { id: 'chalky',   name: 'Chalky',     description: 'Alkaline soil with high calcium carbonate content.' },
  { id: 'volcanic', name: 'Volcanic',   description: 'Highly fertile, mineral-rich soil from volcanic activity.' },
  { id: 'desert',   name: 'Desert Soil',description: 'Dry, sandy soil with low organic content.' },
  { id: 'other',    name: 'Other',      description: 'Other soil type not listed.' },
  { id: 'unknown',  name: "I don't know",description: 'Not sure of the soil type.' },
]

export const getSoil = (id: string) => SOILS.find(s => s.id === id)

export const CROP_STAGES = [
  { id: 'newly-planted', name: 'Newly Planted' },
  { id: 'germination',   name: 'Germination'   },
  { id: 'seedling',      name: 'Seedling'      },
  { id: 'growing',       name: 'Growing'       },
  { id: 'flowering',     name: 'Flowering'     },
  { id: 'fruiting',      name: 'Fruiting'      },
  { id: 'maturity',      name: 'Maturity'      },
  { id: 'harvesting',    name: 'Harvesting'    },
  { id: 'unknown',       name: 'Unknown'       },
]
