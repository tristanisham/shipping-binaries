import type { FC } from "hono/jsx";


export const WeatherWidget: FC = () => {
  return (
    <>
      <div className="flex flex-col">
        <div></div>
        {/* Vertical divider */}
        <div
          role="separator"
          aria-orientation="vertical"
          class="mx-4 grow border-l border-gray-300"
        ></div>
        <div></div>
      </div>
    </>
  )
}