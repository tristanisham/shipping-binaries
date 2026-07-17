type NavProps = {
  currentPath: string
}

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' }
]

function isActive(href: string, currentPath: string) {
  return href === '/' ? currentPath === '/' : currentPath.startsWith(href)
}

export function Nav({ currentPath }: NavProps) {
  return (
    <nav class='mt-3 flex gap-4' aria-label='Primary navigation'>
      {links.map((link) => {
        const active = isActive(link.href, currentPath)
        return (
          <a
            href={link.href}
            aria-current={active ? 'page' : undefined}
            class={
              active
                ? 'text-orange-600 underline underline-offset-4'
                : 'text-red-600 hover:text-orange-600'
            }
          >
            {link.label}
          </a>
        )
      })}
    </nav>
  )
}
