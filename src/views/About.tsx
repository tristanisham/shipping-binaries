import { Base } from './layouts/Base.js'

type AboutProps = {
  currentPath: string
}

export function About({ currentPath }: AboutProps) {
  return (
    <Base title='About' currentPath={currentPath}>
      <div class='mx-auto max-w-2xl space-y-4'>
        <h1 class='text-3xl font-bold'>About</h1>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
          tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
          veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
          commodo consequat.
        </p>
        <p>
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
          dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
          proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
        </p>
      </div>
    </Base>
  )
}
