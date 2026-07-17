export function Nav() {
  return (
    <nav class='container mx-auto' aria-label='Primary navigation'>
      <a class='text-red-600 hover:text-orange-600' href='/'>Home</a>
      {' · '}
      <a class='text-red-600 hover:text-orange-600' href='/about'>About</a>
      {' · '}
      <a class='text-red-600 hover:text-orange-600' href='/blog'>Blog</a>
    </nav>
  )
}
