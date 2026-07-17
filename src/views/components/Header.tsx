import { Nav } from './Nav.js'
import { Island } from './Island.js'
import { HeaderWidget } from './HeaderWidget.js'

type HeaderProps = {
  currentPath: string
}

// The burnt-orange accent (red-600 -> orange-600 gradient) is scoped to the
// header only: the site title and the widget accents.
export function Header({ currentPath }: HeaderProps) {
  return (
    <header class='border-b border-gray-200'>
      <div class='container mx-auto flex flex-col gap-4 px-4 py-6 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <a
            href='/'
            class='inline-block bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-2xl font-bold text-transparent'
          >
            Shipping Binaries
          </a>
          <Nav currentPath={currentPath} />
        </div>
        <Island name='HeaderWidget' props={{ defaultCity: 'Cleveland' }}>
          <HeaderWidget defaultCity='Cleveland' />
        </Island>
      </div>
    </header>
  )
}
