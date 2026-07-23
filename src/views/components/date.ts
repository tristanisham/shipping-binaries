// D1 timestamps are "YYYY-MM-DD HH:MM:SS" (UTC).
export const toIsoTimestamp = (value: string): string | undefined => {
  const isoValue = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  const date = new Date(isoValue);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};
