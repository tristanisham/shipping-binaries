import { Nav } from './Nav.js'

type HeaderProps = {
  currentPath: string
}

export function Header({ currentPath }: HeaderProps) {
  return (
    <header class='container mx-auto px-4 py-6'>
      <Nav currentPath={currentPath} />
      <a href='/' class='mt-4 inline-block text-2xl font-bold'>
        Shipping Binaries
      </a>
    </header>
  )
}
