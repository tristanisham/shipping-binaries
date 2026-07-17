import { Base } from './layouts/Base.js'

type NotFoundProps = {
  currentPath: string
}

export function NotFound({ currentPath }: NotFoundProps) {
  return (
    <Base title='Not Found' currentPath={currentPath}>
      <h1 class='mb-4 text-3xl font-bold'>404</h1>
      <p>That page could not be found.</p>
    </Base>
  )
}
