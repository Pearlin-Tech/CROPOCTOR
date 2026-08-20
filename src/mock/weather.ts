import type { WeatherData } from '@/types'

export const MOCK_WEATHER: WeatherData = {
  temperature: 29,
  feelsLike: 32,
  humidity: 75,
  rainChance: 60,
  windSpeed: 14,
  windDirection: 'SW',
  description: 'Partly Cloudy',
  icon: 'partly-cloudy',
  uvIndex: 6,
  isDemo: true,
  forecast: [
    { date: '2024-08-20', dayLabel: 'Today', high: 29, low: 23, icon: 'partly-cloudy', rainChance: 60, description: 'Partly cloudy' },
    { date: '2024-08-21', dayLabel: 'Tomorrow', high: 27, low: 22, icon: 'rainy', rainChance: 85, description: 'Heavy rain expected' },
    { date: '2024-08-22', dayLabel: 'Thu', high: 26, low: 21, icon: 'rainy', rainChance: 70, description: 'Showers' },
    { date: '2024-08-23', dayLabel: 'Fri', high: 28, low: 22, icon: 'partly-cloudy', rainChance: 30, description: 'Clearing up' },
    { date: '2024-08-24', dayLabel: 'Sat', high: 30, low: 23, icon: 'sunny', rainChance: 10, description: 'Sunny' },
    { date: '2024-08-25', dayLabel: 'Sun', high: 31, low: 24, icon: 'sunny', rainChance: 5, description: 'Clear' },
    { date: '2024-08-26', dayLabel: 'Mon', high: 29, low: 22, icon: 'partly-cloudy', rainChance: 25, description: 'Partly cloudy' },
  ],
  farmImpact: {
    irrigation: { status: 'delay', reason: 'Heavy rain expected tomorrow. Soil moisture is adequate.' },
    spraying:   { status: 'postpone', reason: 'Wind speed and upcoming rain make spraying ineffective.' },
    diseaseRisk:{ level: 'elevated', reason: 'High humidity and rain increase fungal disease risk.' },
  },
}
