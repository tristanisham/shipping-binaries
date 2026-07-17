import { useState } from 'hono/jsx'

type CounterProps = {
  start?: number
}

// Example hydrated component. Rendered statically on the server, then made
// interactive on the client. Use this pattern for demos, illustrations,
// and graphs.
export function Counter({ start = 0 }: CounterProps) {
  const [count, setCount] = useState(start)

  return (
    <div class='inline-flex items-center gap-3 rounded border border-gray-300 p-3'>
      <button
        type='button'
        class='rounded bg-red-600 px-3 py-1 text-white hover:bg-orange-600'
        onClick={() => setCount(count - 1)}
      >
        −
      </button>
      <span class='min-w-8 text-center font-mono text-lg'>{count}</span>
      <button
        type='button'
        class='rounded bg-red-600 px-3 py-1 text-white hover:bg-orange-600'
        onClick={() => setCount(count + 1)}
      >
        +
      </button>
    </div>
  )
}
