import type { FC } from "hono/jsx";

const weatherWidgetScript = `
(() => {
  const widget = document.currentScript?.closest("[data-weather-widget]");
  if (!widget || widget.dataset.initialized === "true") return;

  widget.dataset.initialized = "true";

  const temperature = widget.querySelector("[data-weather-temperature]");
  const unitToggle = widget.querySelector("[data-weather-unit]");
  const icon = widget.querySelector("[data-weather-icon]");

  if (!temperature || !unitToggle || !icon) return;

  let temperatureF = null;
  let unit = "F";
  let forecast = "Weather unavailable";
  const iconPrefix = widget.dataset.weatherIconPrefix || "weather-";

  const getIconName = (weather) => {
    const condition = (weather.shortForecast + " " + weather.icon).toLowerCase();
    const isNight = weather.icon.includes("/night/");

    if (/thunder|lightning|tsra/.test(condition)) return "cloud-lightning";
    if (/snow|sleet|flurr|ice|freezing/.test(condition)) return "cloud-snow";
    if (/rain|shower|drizzle/.test(condition)) return "cloud-rain";
    if (/fog|mist|haze|smoke/.test(condition)) return "cloud-fog";
    if (/partly|scattered|few/.test(condition)) return isNight ? "cloud-moon" : "cloud-sun";
    if (/cloud|overcast|bkn|ovc/.test(condition)) return "cloud";
    if (/clear|sunny|skc/.test(condition)) return isNight ? "moon" : "sun";

    return isNight ? "cloud-moon" : "cloud-sun";
  };

  const render = () => {
    if (temperatureF === null) return;

    const value = unit === "F"
      ? temperatureF
      : Math.round((temperatureF - 32) * 5 / 9);

    temperature.textContent = String(value);
    unitToggle.textContent = unit;
    unitToggle.setAttribute(
      "aria-label",
      unit === "F" ? "Show temperature in Celsius" : "Show temperature in Fahrenheit",
    );
    widget.setAttribute(
      "aria-label",
      "Cleveland, Ohio weather: " + forecast + ", " + value + " degrees " +
        (unit === "F" ? "Fahrenheit" : "Celsius"),
    );
  };

  unitToggle.addEventListener("click", () => {
    unit = unit === "F" ? "C" : "F";
    render();
  });

  window.shippingBinariesWeatherRequest ??=
    fetch("/api/weather", { headers: { Accept: "application/json" } })
      .then((response) => {
        if (!response.ok) throw new Error("Weather request failed");
        return response.json();
      });

  window.shippingBinariesWeatherRequest
    .then((weather) => {
      if (!Number.isFinite(weather.temperatureF)) {
        throw new Error("Weather response was missing a temperature");
      }

      temperatureF = Math.round(weather.temperatureF);
      forecast = weather.shortForecast || "Current conditions";
      icon.setAttribute("href", "#" + iconPrefix + getIconName(weather));
      widget.title = "Cleveland, Ohio: " + forecast;
      render();
    })
    .catch(() => {
      widget.title = "Cleveland weather is unavailable";
      unitToggle.setAttribute("disabled", "");
    });
})();
`;

type WeatherWidgetProps = {
  compact?: boolean;
  instance?: string;
};

export const WeatherWidget: FC<WeatherWidgetProps> = ({
  compact = false,
  instance,
}) => {
  const iconPrefix = instance ? `weather-${instance}-` : "weather-";
  const iconId = (name: string) => `${iconPrefix}${name}`;

  return (
    <div
      aria-label="Loading Cleveland, Ohio weather"
      aria-live="polite"
      class={compact
        ? "flex items-center gap-1 text-amber-50 dark:text-mist-600"
        : "m-4 flex items-center gap-1 text-amber-50 dark:text-mist-600"}
      data-weather-icon-prefix={iconPrefix}
      data-weather-widget
    >
      <svg
        aria-hidden="true"
        class="size-5 fill-none stroke-current"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <use data-weather-icon href={`#${iconId("cloud")}`} />
        <defs>
          <symbol id={iconId("cloud")} viewBox="0 0 24 24">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
          </symbol>
          <symbol id={iconId("cloud-sun")} viewBox="0 0 24 24">
            <path d="M12 2v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="M20 12h2" />
            <path d="m19.07 4.93-1.41 1.41" />
            <path d="M15.947 12.65a4 4 0 0 0-5.925-4.128" />
            <path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z" />
          </symbol>
          <symbol id={iconId("cloud-moon")} viewBox="0 0 24 24">
            <path d="M13 16a3 3 0 0 1 0 6H7a5 5 0 1 1 4.9-6z" />
            <path d="M18.376 14.512a6 6 0 0 0 3.461-4.127c.148-.625-.659-.97-1.248-.714a4 4 0 0 1-5.259-5.26c.255-.589-.09-1.395-.716-1.248a6 6 0 0 0-4.594 5.36" />
          </symbol>
          <symbol id={iconId("cloud-rain")} viewBox="0 0 24 24">
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path d="M16 14v6" />
            <path d="M8 14v6" />
            <path d="M12 16v6" />
          </symbol>
          <symbol id={iconId("cloud-lightning")} viewBox="0 0 24 24">
            <path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973" />
            <path d="m13 12-3 5h4l-3 5" />
          </symbol>
          <symbol id={iconId("cloud-snow")} viewBox="0 0 24 24">
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path d="M8 15h.01" />
            <path d="M8 19h.01" />
            <path d="M12 17h.01" />
            <path d="M12 21h.01" />
            <path d="M16 15h.01" />
            <path d="M16 19h.01" />
          </symbol>
          <symbol id={iconId("cloud-fog")} viewBox="0 0 24 24">
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path d="M16 17H7" />
            <path d="M17 21H9" />
          </symbol>
          <symbol id={iconId("sun")} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </symbol>
          <symbol id={iconId("moon")} viewBox="0 0 24 24">
            <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
          </symbol>
        </defs>
      </svg>
      <span class="font-bold tabular-nums" data-weather-temperature>--</span>
      <sup class="text-[0.5rem] leading-none">
        °
        <button
          aria-label="Show temperature in Celsius"
          class="cursor-pointer font-bold"
          data-weather-unit
          type="button"
        >
          F
        </button>
      </sup>
      <script dangerouslySetInnerHTML={{ __html: weatherWidgetScript }} />
    </div>
  );
};
