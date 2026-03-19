import { CliError } from "../errors.ts";
import {
  DEFAULT_ALLOWED_TIMEZONES,
  DEFAULT_FORMAT_SOLVE_COUNTS,
  DEFAULT_WCA_EVENT_IDS,
  DEFAULT_WCA_FORMATS,
  OTHER_ACTIVITY_CODES,
} from "./constants.ts";
import type {
  ExistingCompetitionEventState,
  WcifActivity,
  WcifCompetition,
  WcifCompetitionEvent,
  WcifPerson,
  WcifRoom,
  WcifRound,
  WcifValidationContext,
  WcifValidationIssue,
  WcifValidationResult,
  WcifVenue,
} from "./wcif-types.ts";

class WcifValidationCollector {
  readonly issues: WcifValidationIssue[] = [];

  add(path: string, code: string, message: string): void {
    this.issues.push({ path, code, message });
  }

  require(condition: unknown, path: string, code: string, message: string): void {
    if (!condition) {
      this.add(path, code, message);
    }
  }

  result(): WcifValidationResult {
    return {
      ok: this.issues.length === 0,
      issues: this.issues,
    };
  }
}

export class WcifValidationError extends CliError {
  constructor(readonly issues: WcifValidationIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
    this.name = "WcifValidationError";
  }
}

export function validateWcif(
  wcif: WcifCompetition,
  context: WcifValidationContext,
): WcifValidationResult {
  const collector = new WcifValidationCollector();
  validateTopLevelShape(wcif, collector);
  validateSeries(wcif, context, collector);
  validateEvents(wcif, context, collector);
  validateSchedule(wcif, context, collector);
  validatePersons(wcif, context, collector);
  validateCompetitorLimit(wcif, context, collector);
  validateExtensions(wcif.extensions, "extensions", collector);
  return collector.result();
}

export function assertValidWcif(
  wcif: WcifCompetition,
  context: WcifValidationContext,
): void {
  const result = validateWcif(wcif, context);

  if (!result.ok) {
    throw new WcifValidationError(result.issues);
  }
}

function validateTopLevelShape(
  wcif: WcifCompetition,
  collector: WcifValidationCollector,
): void {
  collector.require(typeof wcif.formatVersion === "string", "formatVersion", "required", "formatVersion must be a string.");
  collector.require(typeof wcif.id === "string", "id", "required", "id must be a string.");
  collector.require(typeof wcif.name === "string", "name", "required", "name must be a string.");
  collector.require(typeof wcif.shortName === "string", "shortName", "required", "shortName must be a string.");
  collector.require(Array.isArray(wcif.persons), "persons", "required", "persons must be an array.");
  collector.require(Array.isArray(wcif.events), "events", "required", "events must be an array.");
  collector.require(typeof wcif.schedule === "object" && wcif.schedule !== null, "schedule", "required", "schedule must be an object.");

  if (wcif.registrationInfo) {
    collector.require(
      typeof wcif.registrationInfo.baseEntryFee === "number",
      "registrationInfo.baseEntryFee",
      "invalid_type",
      "registrationInfo.baseEntryFee must be a number.",
    );
  }
}

function validateSeries(
  wcif: WcifCompetition,
  context: WcifValidationContext,
  collector: WcifValidationCollector,
): void {
  if (!wcif.series) {
    return;
  }

  const competitionIds = wcif.series.competitionIds;
  collector.require(Array.isArray(competitionIds), "series.competitionIds", "required", "series.competitionIds must be an array.");

  if (!Array.isArray(competitionIds)) {
    return;
  }

  collector.require(
    competitionIds.includes(context.competition.id),
    "series.competitionIds",
    "missing_competition_id",
    "series.competitionIds must include the current competition id.",
  );
  collector.require(
    competitionIds.length >= 2,
    "series.competitionIds",
    "series_too_small",
    "series.competitionIds must include at least two competition ids.",
  );

  if (
    !context.permissions?.canUpdateCompetitionSeries &&
    hasChanged(competitionIds, context.competition.seriesCompetitionIds ?? [])
  ) {
    collector.add(
      "series",
      "permission_denied",
      "Updating competition series requires canUpdateCompetitionSeries permission.",
    );
  }
}

function validateEvents(
  wcif: WcifCompetition,
  context: WcifValidationContext,
  collector: WcifValidationCollector,
): void {
  if (!Array.isArray(wcif.events)) {
    return;
  }

  const allowedEvents = new Set(context.allowedEventIds ?? DEFAULT_WCA_EVENT_IDS);
  const allowedFormats = new Set(context.allowedFormatIds ?? DEFAULT_WCA_FORMATS);
  const existingEvents = new Map(
    (context.competition.events ?? []).map((event) => [event.id, event] satisfies [string, ExistingCompetitionEventState]),
  );

  for (const [eventIndex, event] of wcif.events.entries()) {
    const eventPath = `events[${eventIndex}]`;
    collector.require(typeof event.id === "string", `${eventPath}.id`, "required", "Event id must be a string.");

    if (!event.id) {
      continue;
    }

    collector.require(
      allowedEvents.has(event.id),
      `${eventPath}.id`,
      "invalid_event_id",
      `Unsupported event id "${event.id}".`,
    );

    const existing = existingEvents.get(event.id);
    const hasRounds = Array.isArray(event.rounds);

    if (!existing && hasRounds && !context.permissions?.canAddAndRemoveEvents) {
      collector.add(
        `${eventPath}.rounds`,
        "permission_denied",
        `Adding event "${event.id}" requires canAddAndRemoveEvents permission.`,
      );
    }

    if (existing && event.rounds === null && !context.permissions?.canAddAndRemoveEvents) {
      collector.add(
        `${eventPath}.rounds`,
        "permission_denied",
        `Removing event "${event.id}" requires canAddAndRemoveEvents permission.`,
      );
    }

    if (existing && hasRounds && !context.permissions?.canUpdateEvents) {
      collector.add(
        `${eventPath}.rounds`,
        "permission_denied",
        `Updating event "${event.id}" requires canUpdateEvents permission.`,
      );
    }

    if (existing?.hasLockedRoundStructure && hasRounds) {
      collector.add(
        `${eventPath}.rounds`,
        "locked_round_structure",
        "Cannot edit rounds for a competition which has qualification rounds or b-finals.",
      );
    }

    if (hasRounds) {
      validateRounds(event, eventPath, allowedFormats, context, collector);
    }

    validateExtensions(event.extensions, `${eventPath}.extensions`, collector);
  }
}

function validateRounds(
  event: WcifCompetitionEvent,
  eventPath: string,
  allowedFormats: Set<string>,
  context: WcifValidationContext,
  collector: WcifValidationCollector,
): void {
  if (!Array.isArray(event.rounds)) {
    return;
  }

  const formatSolveCounts = context.formatExpectedSolveCounts ?? DEFAULT_FORMAT_SOLVE_COUNTS;

  for (const [roundIndex, round] of event.rounds.entries()) {
    const roundPath = `${eventPath}.rounds[${roundIndex}]`;
    validateRound(event.id ?? "", round, roundPath, roundIndex, event.rounds.length, allowedFormats, formatSolveCounts, collector);
  }
}

function validateRound(
  eventId: string,
  round: WcifRound,
  roundPath: string,
  roundIndex: number,
  totalRounds: number,
  allowedFormats: Set<string>,
  formatSolveCounts: Record<string, number>,
  collector: WcifValidationCollector,
): void {
  collector.require(typeof round.id === "string", `${roundPath}.id`, "required", "Round id must be a string.");
  collector.require(typeof round.format === "string", `${roundPath}.format`, "required", "Round format must be a string.");

  if (round.id) {
    const parsed = parseRoundId(round.id);
    collector.require(parsed !== null, `${roundPath}.id`, "invalid_round_id", `Invalid round id "${round.id}".`);

    if (parsed) {
      collector.require(
        parsed.eventId === eventId,
        `${roundPath}.id`,
        "round_event_mismatch",
        `Round id "${round.id}" must match event "${eventId}".`,
      );
      collector.require(
        parsed.roundNumber >= 1 && parsed.roundNumber <= 4,
        `${roundPath}.id`,
        "invalid_round_number",
        "Round number must be between 1 and 4.",
      );
    }
  }

  if (round.format) {
    collector.require(
      allowedFormats.has(round.format),
      `${roundPath}.format`,
      "invalid_format",
      `Unsupported round format "${round.format}".`,
    );
  }

  const isFinal = roundIndex === totalRounds - 1;
  collector.require(
    !(isFinal && round.advancementCondition),
    `${roundPath}.advancementCondition`,
    "final_round_advancement",
    "Final rounds cannot define an advancement condition.",
  );

  if (round.timeLimit) {
    collector.require(
      typeof round.timeLimit.centiseconds === "number",
      `${roundPath}.timeLimit.centiseconds`,
      "invalid_type",
      "timeLimit.centiseconds must be an integer.",
    );
    if (round.timeLimit.cumulativeRoundIds) {
      collector.require(
        round.timeLimit.cumulativeRoundIds.every((value) => typeof value === "string"),
        `${roundPath}.timeLimit.cumulativeRoundIds`,
        "invalid_type",
        "timeLimit.cumulativeRoundIds must be an array of strings.",
      );
    }
  }

  if (round.cutoff) {
    collector.require(
      typeof round.cutoff.numberOfAttempts === "number",
      `${roundPath}.cutoff.numberOfAttempts`,
      "invalid_type",
      "cutoff.numberOfAttempts must be an integer.",
    );
    collector.require(
      typeof round.cutoff.attemptResult === "number",
      `${roundPath}.cutoff.attemptResult`,
      "invalid_type",
      "cutoff.attemptResult must be an integer.",
    );
  }

  if (round.advancementCondition) {
    collector.require(
      ["attemptResult", "percent", "ranking"].includes(round.advancementCondition.type ?? ""),
      `${roundPath}.advancementCondition.type`,
      "invalid_value",
      "advancementCondition.type must be attemptResult, percent, or ranking.",
    );
    collector.require(
      typeof round.advancementCondition.level === "number",
      `${roundPath}.advancementCondition.level`,
      "invalid_type",
      "advancementCondition.level must be an integer.",
    );
  }

  for (const [resultIndex, result] of (round.results ?? []).entries()) {
    const resultPath = `${roundPath}.results[${resultIndex}]`;
    collector.require(typeof result.personId === "number", `${resultPath}.personId`, "invalid_type", "personId must be an integer.");
    collector.require(typeof result.best === "number", `${resultPath}.best`, "invalid_type", "best must be an integer.");
    collector.require(typeof result.average === "number", `${resultPath}.average`, "invalid_type", "average must be an integer.");
    collector.require(
      result.ranking === null || typeof result.ranking === "number",
      `${resultPath}.ranking`,
      "invalid_type",
      "ranking must be an integer or null.",
    );
    collector.require(
      (result.attempts?.length ?? 0) <= 5,
      `${resultPath}.attempts`,
      "too_many_attempts",
      "Round results cannot contain more than five attempts.",
    );

    for (const [attemptIndex, attempt] of (result.attempts ?? []).entries()) {
      collector.require(
        typeof attempt.result === "number",
        `${resultPath}.attempts[${attemptIndex}].result`,
        "invalid_type",
        "Attempt result must be an integer.",
      );
      collector.require(
        attempt.reconstruction === null || typeof attempt.reconstruction === "string" || attempt.reconstruction === undefined,
        `${resultPath}.attempts[${attemptIndex}].reconstruction`,
        "invalid_type",
        "Attempt reconstruction must be a string or null.",
      );
    }
  }

  validateExtensions(round.extensions, `${roundPath}.extensions`, collector);

  const maxAttempt = maxAttemptNumberSeen(round);
  const expectedSolveCount = round.format ? formatSolveCounts[round.format] : undefined;

  if (expectedSolveCount && maxAttempt > expectedSolveCount) {
    collector.add(
      roundPath,
      "attempt_number_exceeded",
      `Activity or round data references attempt ${maxAttempt}, but format "${round.format}" allows ${expectedSolveCount} solves.`,
    );
  }
}

function validateSchedule(
  wcif: WcifCompetition,
  context: WcifValidationContext,
  collector: WcifValidationCollector,
): void {
  if (!wcif.schedule) {
    return;
  }

  collector.require(
    wcif.schedule.startDate === context.competition.startDate,
    "schedule.startDate",
    "schedule_mismatch",
    "schedule.startDate must match the competition start date.",
  );
  collector.require(
    wcif.schedule.numberOfDays === context.competition.numberOfDays,
    "schedule.numberOfDays",
    "schedule_mismatch",
    "schedule.numberOfDays must match the competition number of days.",
  );

  const activityIds = new Set<number>();
  const allowedTimezones = new Set(context.allowedTimezoneIds ?? DEFAULT_ALLOWED_TIMEZONES);

  for (const [venueIndex, venue] of (wcif.schedule.venues ?? []).entries()) {
    validateVenue(venue, `schedule.venues[${venueIndex}]`, allowedTimezones, activityIds, context, collector);
  }
}

function validateVenue(
  venue: WcifVenue,
  venuePath: string,
  allowedTimezones: Set<string>,
  activityIds: Set<number>,
  context: WcifValidationContext,
  collector: WcifValidationCollector,
): void {
  collector.require(typeof venue.id === "number", `${venuePath}.id`, "required", "Venue id must be an integer.");
  collector.require(typeof venue.name === "string" && venue.name.length > 0, `${venuePath}.name`, "required", "Venue name is required.");
  collector.require(typeof venue.latitudeMicrodegrees === "number", `${venuePath}.latitudeMicrodegrees`, "required", "Venue latitudeMicrodegrees must be an integer.");
  collector.require(typeof venue.longitudeMicrodegrees === "number", `${venuePath}.longitudeMicrodegrees`, "required", "Venue longitudeMicrodegrees must be an integer.");
  collector.require(typeof venue.countryIso2 === "string", `${venuePath}.countryIso2`, "required", "Venue countryIso2 is required.");
  collector.require(
    typeof venue.timezone === "string" && allowedTimezones.has(venue.timezone),
    `${venuePath}.timezone`,
    "invalid_timezone",
    `Unsupported timezone "${venue.timezone ?? ""}".`,
  );

  for (const [roomIndex, room] of (venue.rooms ?? []).entries()) {
    validateRoom(room, `${venuePath}.rooms[${roomIndex}]`, activityIds, context, collector);
  }

  validateExtensions(venue.extensions, `${venuePath}.extensions`, collector);
}

function validateRoom(
  room: WcifRoom,
  roomPath: string,
  activityIds: Set<number>,
  context: WcifValidationContext,
  collector: WcifValidationCollector,
): void {
  collector.require(typeof room.id === "number", `${roomPath}.id`, "required", "Room id must be an integer.");
  collector.require(typeof room.name === "string" && room.name.length > 0, `${roomPath}.name`, "required", "Room name is required.");

  if (room.color !== undefined) {
    collector.require(
      /^#[0-9a-fA-F]{6}$/.test(room.color),
      `${roomPath}.color`,
      "invalid_color",
      "Room color must be a valid hex color like #304a96.",
    );
  }

  for (const [activityIndex, activity] of (room.activities ?? []).entries()) {
    validateActivity(activity, `${roomPath}.activities[${activityIndex}]`, undefined, activityIds, context, collector);
  }
}

function validateActivity(
  activity: WcifActivity,
  activityPath: string,
  parentActivity: WcifActivity | undefined,
  activityIds: Set<number>,
  context: WcifValidationContext,
  collector: WcifValidationCollector,
): void {
  collector.require(typeof activity.id === "number", `${activityPath}.id`, "required", "Activity id must be an integer.");
  collector.require(typeof activity.name === "string" && activity.name.length > 0, `${activityPath}.name`, "required", "Activity name is required.");
  collector.require(
    typeof activity.activityCode === "string" && activity.activityCode.length > 0,
    `${activityPath}.activityCode`,
    "required",
    "Activity code is required.",
  );
  collector.require(typeof activity.startTime === "string", `${activityPath}.startTime`, "required", "Activity startTime is required.");
  collector.require(typeof activity.endTime === "string", `${activityPath}.endTime`, "required", "Activity endTime is required.");

  if (typeof activity.id === "number") {
    collector.require(
      !activityIds.has(activity.id),
      `${activityPath}.id`,
      "duplicate_activity_id",
      `Duplicate activity id "${activity.id}".`,
    );
    activityIds.add(activity.id);
  }

  const start = parseIsoDateTime(activity.startTime);
  const end = parseIsoDateTime(activity.endTime);
  collector.require(start !== null, `${activityPath}.startTime`, "invalid_datetime", "Activity startTime must be a valid ISO datetime.");
  collector.require(end !== null, `${activityPath}.endTime`, "invalid_datetime", "Activity endTime must be a valid ISO datetime.");

  if (start && end) {
    collector.require(start <= end, `${activityPath}.endTime`, "invalid_range", "Activity start_time must be before or equal to end_time.");

    const competitionStart = parseIsoDate(context.competition.startDate);

    if (competitionStart) {
      const competitionEnd = new Date(competitionStart);
      competitionEnd.setUTCDate(competitionEnd.getUTCDate() + context.competition.numberOfDays);
      collector.require(
        start >= competitionStart && end <= competitionEnd,
        activityPath,
        "activity_outside_competition",
        "Activity must be within competition dates.",
      );
    }
  }

  if (activity.activityCode) {
    validateActivityCode(activity.activityCode, activityPath, parentActivity?.activityCode, collector);
  }

  if (parentActivity && start && end) {
    const parentStart = parseIsoDateTime(parentActivity.startTime);
    const parentEnd = parseIsoDateTime(parentActivity.endTime);

    if (parentStart && parentEnd) {
      collector.require(
        start >= parentStart && end <= parentEnd,
        activityPath,
        "child_activity_outside_parent",
        "Child activities must be within parent activity times.",
      );
    }
  }

  validateExtensions(activity.extensions, `${activityPath}.extensions`, collector);

  for (const [childIndex, child] of (activity.childActivities ?? []).entries()) {
    validateActivity(
      child,
      `${activityPath}.childActivities[${childIndex}]`,
      activity,
      activityIds,
      context,
      collector,
    );
  }
}

function validatePersons(
  wcif: WcifCompetition,
  _context: WcifValidationContext,
  collector: WcifValidationCollector,
): void {
  if (!Array.isArray(wcif.persons)) {
    return;
  }

  const activityIds = collectActivityIds(wcif);

  for (const [personIndex, person] of wcif.persons.entries()) {
    validatePerson(person, `persons[${personIndex}]`, activityIds, collector);
  }
}

function validatePerson(
  person: WcifPerson,
  personPath: string,
  activityIds: Set<number>,
  collector: WcifValidationCollector,
): void {
  collector.require(typeof person.name === "string", `${personPath}.name`, "required", "Person name must be a string.");
  collector.require(typeof person.wcaUserId === "number", `${personPath}.wcaUserId`, "required", "wcaUserId must be an integer.");
  collector.require(typeof person.countryIso2 === "string", `${personPath}.countryIso2`, "required", "countryIso2 must be a string.");
  collector.require(
    ["m", "f", "o"].includes(person.gender ?? ""),
    `${personPath}.gender`,
    "invalid_gender",
    "gender must be one of m, f, or o.",
  );
  collector.require(typeof person.email === "string", `${personPath}.email`, "required", "email must be a string.");

  if (person.registration) {
    collector.require(
      person.registration.isCompeting === undefined || typeof person.registration.isCompeting === "boolean",
      `${personPath}.registration.isCompeting`,
      "invalid_type",
      "registration.isCompeting must be a boolean.",
    );
  }

  for (const [assignmentIndex, assignment] of (person.assignments ?? []).entries()) {
    const assignmentPath = `${personPath}.assignments[${assignmentIndex}]`;
    collector.require(
      typeof assignment.activityId === "number" && activityIds.has(assignment.activityId),
      `${assignmentPath}.activityId`,
      "unknown_activity",
      "Assignment activityId must reference an existing schedule activity.",
    );
    collector.require(
      assignment.stationNumber === null ||
        assignment.stationNumber === undefined ||
        typeof assignment.stationNumber === "number",
      `${assignmentPath}.stationNumber`,
      "invalid_type",
      "stationNumber must be an integer or null.",
    );
    collector.require(
      typeof assignment.assignmentCode === "string" &&
        /^(competitor|staff-\w+)$/.test(assignment.assignmentCode),
      `${assignmentPath}.assignmentCode`,
      "invalid_assignment_code",
      "assignmentCode must match ^(competitor|staff-\\w+)$.",
    );
  }

  validateExtensions(person.extensions, `${personPath}.extensions`, collector);
}

function validateCompetitorLimit(
  wcif: WcifCompetition,
  context: WcifValidationContext,
  collector: WcifValidationCollector,
): void {
  if (wcif.competitorLimit === undefined || wcif.competitorLimit === null) {
    return;
  }

  collector.require(
    typeof wcif.competitorLimit === "number",
    "competitorLimit",
    "invalid_type",
    "competitorLimit must be an integer or null.",
  );

  const changed = wcif.competitorLimit !== context.competition.competitorLimit;

  if (!changed) {
    return;
  }

  if (context.competition.confirmed && !context.permissions?.canAdminCompetitions) {
    collector.add(
      "competitorLimit",
      "permission_denied",
      "Changing competitorLimit on a confirmed competition requires canAdminCompetitions permission.",
    );
  }

  if (context.competition.competitorLimitsEnabled === false) {
    collector.add(
      "competitorLimit",
      "feature_disabled",
      "Competitor limits are not enabled for this competition.",
    );
  }
}

function validateExtensions(
  extensions: { id?: string; specUrl?: string }[] | undefined,
  path: string,
  collector: WcifValidationCollector,
): void {
  for (const [index, extension] of (extensions ?? []).entries()) {
    const extensionPath = `${path}[${index}]`;
    collector.require(
      typeof extension.id === "string" && /^\w+(\.\w+)*$/.test(extension.id),
      `${extensionPath}.id`,
      "invalid_extension_id",
      "Extension id must match \\w+(\\.\\w+)*.",
    );

    if (extension.specUrl !== undefined) {
      collector.require(
        isValidUrl(extension.specUrl),
        `${extensionPath}.specUrl`,
        "invalid_url",
        "Extension specUrl must be a valid URL.",
      );
    }
  }
}

function collectActivityIds(wcif: WcifCompetition): Set<number> {
  const ids = new Set<number>();

  for (const venue of wcif.schedule?.venues ?? []) {
    for (const room of venue.rooms ?? []) {
      for (const activity of room.activities ?? []) {
        collectActivityIdsFromNode(activity, ids);
      }
    }
  }

  return ids;
}

function collectActivityIdsFromNode(activity: WcifActivity, ids: Set<number>): void {
  if (typeof activity.id === "number") {
    ids.add(activity.id);
  }

  for (const child of activity.childActivities ?? []) {
    collectActivityIdsFromNode(child, ids);
  }
}

function validateActivityCode(
  activityCode: string,
  activityPath: string,
  parentActivityCode: string | undefined,
  collector: WcifValidationCollector,
): void {
  const parsed = parseActivityCode(activityCode);
  collector.require(parsed !== null, `${activityPath}.activityCode`, "invalid_activity_code", `Invalid activity code "${activityCode}".`);

  if (!parsed) {
    return;
  }

  if (parsed.base === "other") {
    collector.require(
      parsed.otherCode !== undefined && OTHER_ACTIVITY_CODES.includes(parsed.otherCode),
      `${activityPath}.activityCode`,
      "invalid_other_activity_code",
      `Unsupported other activity code "${parsed.otherCode ?? ""}".`,
    );
  }

  if (parentActivityCode) {
    const parentParsed = parseActivityCode(parentActivityCode);

    if (parentParsed) {
      collector.require(
        parentParsed.base === parsed.base,
        `${activityPath}.activityCode`,
        "activity_code_base_mismatch",
        "Child activity base must match the parent activity base.",
      );
    }
  }
}

function parseActivityCode(activityCode: string): {
  base: string;
  otherCode?: (typeof OTHER_ACTIVITY_CODES)[number];
} | null {
  const parts = activityCode.split("-");
  const [base, next] = parts;

  if (!base) {
    return null;
  }

  if (base === "other") {
    return next ? { base, otherCode: next as (typeof OTHER_ACTIVITY_CODES)[number] } : null;
  }

  if (DEFAULT_WCA_EVENT_IDS.includes(base as (typeof DEFAULT_WCA_EVENT_IDS)[number])) {
    return { base };
  }

  return null;
}

function parseRoundId(roundId: string): { eventId: string; roundNumber: number } | null {
  const match = /^([a-z0-9]+)-r([1-4])$/i.exec(roundId);

  if (!match) {
    return null;
  }

  return {
    eventId: match[1]!.toLowerCase(),
    roundNumber: Number(match[2]),
  };
}

function maxAttemptNumberSeen(round: WcifRound): number {
  let maxAttempt = 0;

  for (const result of round.results ?? []) {
    maxAttempt = Math.max(maxAttempt, result.attempts?.length ?? 0);
  }

  return maxAttempt;
}

function parseIsoDate(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function parseIsoDateTime(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function hasChanged(next: string[], current: string[]): boolean {
  if (next.length !== current.length) {
    return true;
  }

  return next.some((value, index) => value !== current[index]);
}
