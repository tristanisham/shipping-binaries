// Inline weather/time-of-day icons (Lucide, ISC-licensed paths). Kept inline to
// avoid a runtime dependency, and rendered as real JSX so they work both
// server-side and after client hydration.
type IconDef = {
  circle?: [number, number, number]
  paths: string[]
}

const icons: Record<string, IconDef> = {
  'clear-day': {
    circle: [12, 12, 4],
    paths: [
      'M12 2v2',
      'M12 20v2',
      'm4.93 4.93 1.41 1.41',
      'm17.66 17.66 1.41 1.41',
      'M2 12h2',
      'M20 12h2',
      'm6.34 17.66-1.41 1.41',
      'm19.07 4.93-1.41 1.41'
    ]
  },
  'clear-night': { paths: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'] },
  'partly-day': {
    paths: [
      'M12 2v2',
      'm4.93 4.93 1.41 1.41',
      'M20 12h2',
      'm19.07 4.93-1.41 1.41',
      'M15.947 12.65a4 4 0 0 0-5.925-4.128',
      'M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z'
    ]
  },
  'partly-night': {
    paths: [
      'M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z',
      'M10.1 9A6 6 0 0 1 16 4a4.24 4.24 0 0 0 6 6 6 6 0 0 1-3 5.197'
    ]
  },
  cloudy: { paths: ['M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z'] },
  rain: {
    paths: [
      'M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242',
      'M16 14v6',
      'M8 14v6',
      'M12 16v6'
    ]
  },
  thunder: {
    paths: ['M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973', 'm13 12-3 5h4l-3 5']
  },
  snow: {
    paths: [
      'M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242',
      'M8 15h.01',
      'M8 19h.01',
      'M12 17h.01',
      'M12 21h.01',
      'M16 15h.01',
      'M16 19h.01'
    ]
  },
  fog: {
    paths: ['M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242', 'M16 17H7', 'M17 21H9']
  }
}

type WeatherIconProps = {
  name: string
  class?: string
}

export function WeatherIcon({ name, class: className }: WeatherIconProps) {
  const icon = icons[name] ?? icons.cloudy
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      stroke-width='2'
      stroke-linecap='round'
      stroke-linejoin='round'
      class={className}
      aria-hidden='true'
    >
      {icon.circle ? <circle cx={icon.circle[0]} cy={icon.circle[1]} r={icon.circle[2]} /> : null}
      {icon.paths.map((d) => (
        <path d={d} />
      ))}
    </svg>
  )
}
