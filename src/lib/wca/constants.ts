export const DEFAULT_WCA_EVENT_IDS = [
  "222",
  "333",
  "444",
  "555",
  "666",
  "777",
  "333bf",
  "333fm",
  "333oh",
  "clock",
  "minx",
  "pyram",
  "skewb",
  "sq1",
  "444bf",
  "555bf",
  "333mbf",
] as const;

export const DEFAULT_WCA_FORMATS = ["1", "2", "3", "a", "m"] as const;

export const DEFAULT_FORMAT_SOLVE_COUNTS: Record<string, number> = {
  "1": 1,
  "2": 2,
  "3": 3,
  a: 5,
  m: 3,
};

export const OTHER_ACTIVITY_CODES = [
  "registration",
  "checkin",
  "multi",
  "breakfast",
  "lunch",
  "dinner",
  "awards",
  "unofficial",
  "misc",
  "tutorial",
  "setup",
  "teardown",
] as const;

export const DEFAULT_ALLOWED_TIMEZONES = new Set([
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/Berlin",
  "Europe/London",
  "Asia/Tokyo",
]);
