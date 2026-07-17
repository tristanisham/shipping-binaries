import { useEffect, useRef, useState } from 'hono/jsx'
import { WeatherIcon } from './WeatherIcon.js'

type HeaderWidgetProps = {
  defaultCity?: string
}

type Weather = {
  available: boolean
  city: string
  tempF?: number
  description?: string
  icon?: string
  // Offset in seconds from UTC for the city (from OpenWeather).
  timezone?: number
}

const CITY_KEY = 'sb:city'

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

// Current wall-clock time for the widget's city. Uses the OpenWeather timezone
// offset when available; otherwise falls back to Eastern time (EST/EDT).
function formatTime(weather: Weather | null): string {
  const now = Date.now()
  if (weather && typeof weather.timezone === 'number') {
    const d = new Date(now + weather.timezone * 1000)
    return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  }
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(now))
  } catch {
    const d = new Date(now)
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }
}

function localHour(weather: Weather | null): number {
  const now = Date.now()
  if (weather && typeof weather.timezone === 'number') {
    return new Date(now + weather.timezone * 1000).getUTCHours()
  }
  try {
    return Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour12: false,
        hour: '2-digit'
      }).format(new Date(now))
    )
  } catch {
    return new Date(now).getHours()
  }
}

// Prefer the weather-derived icon; otherwise pick sun/moon by local hour.
function iconFor(weather: Weather | null): string {
  if (weather && weather.icon) return weather.icon
  const hour = localHour(weather)
  return hour >= 6 && hour < 19 ? 'clear-day' : 'clear-night'
}

export function HeaderWidget({ defaultCity = 'Cleveland' }: HeaderWidgetProps) {
  const [weather, setWeather] = useState<Weather | null>(null)
  const [city, setCity] = useState(defaultCity)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  // Re-render every second so the clock ticks.
  const [, setTick] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  async function load(name: string) {
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(name)}`)
      setWeather((await res.json()) as Weather)
    } catch {
      setWeather({ available: false, city: name })
    }
  }

  useEffect(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(CITY_KEY) : null
    const initial = saved || defaultCity
    setCity(initial)
    void load(initial)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function submitCity(event: Event) {
    event.preventDefault()
    const next = draft.trim()
    if (!next) return
    setCity(next)
    if (typeof localStorage !== 'undefined') localStorage.setItem(CITY_KEY, next)
    setEditing(false)
    setWeather(null)
    void load(next)
  }

  const label =
    weather?.available && typeof weather.tempF === 'number'
      ? `${weather.city} · ${Math.round(weather.tempF)}°F`
      : weather?.city || city

  return (
    <div class='flex items-center gap-3 text-sm'>
      <WeatherIcon name={iconFor(weather)} class='h-6 w-6 text-orange-600' />
      <div class='flex flex-col leading-tight'>
        <span class='font-mono tabular-nums'>{formatTime(weather)}</span>
        {editing ? (
          <form onSubmit={submitCity} class='mt-1 flex gap-1'>
            <input
              ref={inputRef}
              value={draft}
              onInput={(event) => setDraft((event.target as HTMLInputElement).value)}
              placeholder='City'
              aria-label='City'
              class='w-24 rounded border border-gray-300 px-1 py-0.5 text-xs'
            />
            <button
              type='submit'
              class='rounded bg-gradient-to-r from-red-600 to-orange-600 px-2 py-0.5 text-xs font-medium text-white'
            >
              Go
            </button>
          </form>
        ) : (
          <button
            type='button'
            onClick={() => {
              setDraft(city)
              setEditing(true)
            }}
            class='text-left text-gray-600 hover:text-orange-600'
            title='Change city'
          >
            {label}
          </button>
        )}
      </div>
    </div>
  )
}
