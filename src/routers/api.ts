import { Hono } from 'hono'

// Map OpenWeather icon codes (e.g. "01d", "10n") to WeatherIcon keys.
function mapIcon(code: string): string {
  const day = code.endsWith('d')
  switch (code.slice(0, 2)) {
    case '01':
      return day ? 'clear-day' : 'clear-night'
    case '02':
      return day ? 'partly-day' : 'partly-night'
    case '03':
    case '04':
      return 'cloudy'
    case '09':
    case '10':
      return 'rain'
    case '11':
      return 'thunder'
    case '13':
      return 'snow'
    case '50':
      return 'fog'
    default:
      return 'cloudy'
  }
}

type WeatherResponse = {
  available: boolean
  city: string
  tempF?: number
  description?: string
  icon?: string
  timezone?: number
}

// Server-side cache. OpenWeather's free tier is small, and weather barely
// changes minute to minute, so we cache each city for 30 minutes — at most
// ~48 upstream calls/day per city instead of one per page load.
const TTL_MS = 30 * 60 * 1000
const cache = new Map<string, { data: WeatherResponse; expires: number }>()

const api = new Hono()

api.get('/api/weather', async (c) => {
  const city = (c.req.query('city') || 'Cleveland').trim()
  const apiKey = process.env.OPENWEATHER_API_KEY

  // Without a key the feature degrades gracefully (clock + city picker still work).
  if (!apiKey) return c.json<WeatherResponse>({ available: false, city })

  const cacheKey = city.toLowerCase()
  const now = Date.now()
  const cached = cache.get(cacheKey)
  if (cached && cached.expires > now) return c.json(cached.data)

  try {
    const url =
      'https://api.openweathermap.org/data/2.5/weather' +
      `?q=${encodeURIComponent(city)}&units=imperial&appid=${apiKey}`
    const res = await fetch(url)
    if (!res.ok) return c.json<WeatherResponse>({ available: false, city })

    const w = (await res.json()) as {
      name?: string
      main?: { temp?: number }
      weather?: { description?: string; icon?: string }[]
      timezone?: number
    }
    const data: WeatherResponse = {
      available: true,
      city: w.name ?? city,
      tempF: w.main?.temp,
      description: w.weather?.[0]?.description ?? '',
      icon: mapIcon(w.weather?.[0]?.icon ?? '03d'),
      timezone: w.timezone
    }
    cache.set(cacheKey, { data, expires: now + TTL_MS })
    return c.json(data)
  } catch {
    return c.json<WeatherResponse>({ available: false, city })
  }
})

export default api
