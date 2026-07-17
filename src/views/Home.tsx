import { Base } from './layouts/Base.js'
import { Island } from './components/Island.js'
import { Counter } from './components/Counter.js'

type HomeProps = {
  currentPath: string
}

export function Home({ currentPath }: HomeProps) {
  return (
    <Base title='Home' currentPath={currentPath}>
      <h1 class='mb-4 text-3xl font-bold'>Welcome</h1>
      <p class='mb-6'>
        A mostly-static life blog with hydrated components for demos,
        illustrations, and graphs.
      </p>
      <p class='mb-2 text-sm text-gray-500'>
        The counter below is a hydrated client island:
      </p>
      <Island name='Counter' props={{ start: 3 }}>
        <Counter start={3} />
      </Island>
    </Base>
  )
}
