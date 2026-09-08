export function etParts(at = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(new Date(at));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { hour, minute, label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ET` };
}

export function inAnnounceWindow(at = Date.now()) {
  const { hour } = etParts(at);
  return hour >= 1 && hour < 6;
}

export function inNightHunt(at = Date.now()) {
  const { hour } = etParts(at);
  return hour >= 22 || hour < 8;
}

export function listPollMs(at = Date.now()) {
  if (inAnnounceWindow(at)) return 10_000;
  if (inNightHunt(at)) return 20_000;
  return 45_000;
}

export function listHuntMs(at = Date.now()) {
  return listPollMs(at);
}