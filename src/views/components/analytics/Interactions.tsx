import type { FC } from "hono/jsx";

const analyticsInteractionsScript = `
(() => {
  const propertiesFor = (element) => {
    const properties = {};
    const dataset = element.dataset;
    if (dataset.formLabel) properties.form_label = dataset.formLabel;
    if (dataset.postPath) properties.post_path = dataset.postPath;
    if (dataset.postSlug) properties.post_slug = dataset.postSlug;
    if (dataset.postTitle) properties.post_title = dataset.postTitle;
    if (dataset.textSizeDirection) {
      properties.direction = dataset.textSizeDirection;
    }
    if (dataset.isAuthenticated) {
      properties.is_authenticated = dataset.isAuthenticated === "true";
    }
    return properties;
  };

  const capture = (event, element) => {
    if (!event) return;
    window.posthog?.capture(event, propertiesFor(element));
  };

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const element = target.closest("[data-analytics-event]");
    if (!(element instanceof HTMLElement)) return;
    capture(element.dataset.analyticsEvent, element);
  });

  const startedForms = new WeakSet();
  const captureFormStart = (form) => {
    if (startedForms.has(form)) return;
    startedForms.add(form);
    capture(form.dataset.analyticsStartEvent, form);
  };

  document.addEventListener("focusin", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const form = target.closest("form[data-analytics-start-event]");
    if (form instanceof HTMLFormElement) captureFormStart(form);
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.dataset.analyticsStartEvent) captureFormStart(form);
    capture(form.dataset.analyticsSubmitEvent, form);
  });
})();
`;

export const AnalyticsInteractions: FC = () => (
  <script
    dangerouslySetInnerHTML={{ __html: analyticsInteractionsScript }}
  />
);
