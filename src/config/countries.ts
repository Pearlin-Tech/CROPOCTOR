import type { CountryConfig } from '@/types'

export const COUNTRIES: CountryConfig[] = [
  { code: 'IN', name: 'India',                flag: '🇮🇳', languages: ['en','hi','gu','mr','bn','ta','te','kn','ml'], defaultLanguage: 'hi', units: { area: 'acres',    temperature: 'celsius'    }, currency: 'INR', timezone: 'Asia/Kolkata'        },
  { code: 'BR', name: 'Brazil',               flag: '🇧🇷', languages: ['pt','en'],                                    defaultLanguage: 'pt', units: { area: 'hectares', temperature: 'celsius'    }, currency: 'BRL', timezone: 'America/Sao_Paulo'   },
  { code: 'RU', name: 'Russia',               flag: '🇷🇺', languages: ['ru','en'],                                    defaultLanguage: 'ru', units: { area: 'hectares', temperature: 'celsius'    }, currency: 'RUB', timezone: 'Europe/Moscow'        },
  { code: 'CN', name: 'China',                flag: '🇨🇳', languages: ['zh','en'],                                    defaultLanguage: 'zh', units: { area: 'hectares', temperature: 'celsius'    }, currency: 'CNY', timezone: 'Asia/Shanghai'        },
  { code: 'ZA', name: 'South Africa',         flag: '🇿🇦', languages: ['en'],                                         defaultLanguage: 'en', units: { area: 'hectares', temperature: 'celsius'    }, currency: 'ZAR', timezone: 'Africa/Johannesburg'  },
  { code: 'EG', name: 'Egypt',                flag: '🇪🇬', languages: ['ar','en'],                                    defaultLanguage: 'ar', units: { area: 'hectares', temperature: 'celsius'    }, currency: 'EGP', timezone: 'Africa/Cairo'          },
  { code: 'ET', name: 'Ethiopia',             flag: '🇪🇹', languages: ['am','en'],                                    defaultLanguage: 'am', units: { area: 'hectares', temperature: 'celsius'    }, currency: 'ETB', timezone: 'Africa/Addis_Ababa'   },
  { code: 'IR', name: 'Iran',                 flag: '🇮🇷', languages: ['fa','en'],                                    defaultLanguage: 'fa', units: { area: 'hectares', temperature: 'celsius'    }, currency: 'IRR', timezone: 'Asia/Tehran'           },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', languages: ['ar','en'],                                    defaultLanguage: 'ar', units: { area: 'hectares', temperature: 'celsius'    }, currency: 'AED', timezone: 'Asia/Dubai'            },
  { code: 'ID', name: 'Indonesia',            flag: '🇮🇩', languages: ['id','en'],                                    defaultLanguage: 'id', units: { area: 'hectares', temperature: 'celsius'    }, currency: 'IDR', timezone: 'Asia/Jakarta'          },
  { code: 'SA', name: 'Saudi Arabia',         flag: '🇸🇦', languages: ['ar','en'],                                    defaultLanguage: 'ar', units: { area: 'hectares', temperature: 'celsius'    }, currency: 'SAR', timezone: 'Asia/Riyadh'           },
]

export const getCountry = (code: string): CountryConfig | undefined =>
  COUNTRIES.find(c => c.code === code)

export const RTL_LANGUAGES = ['ar', 'fa', 'he', 'ur']
export const isRTL = (lang: string) => RTL_LANGUAGES.includes(lang)
