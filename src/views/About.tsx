import { Base } from './layouts/Base.js'

type AboutProps = {
  currentPath: string
}

export function About({ currentPath }: AboutProps) {
  return (
    <Base title='About' currentPath={currentPath}>
      <h1 class='mb-4 text-3xl font-bold'>About</h1>
      <p>A life blog about shipping binaries.</p>
    </Base>
  )
}
