export interface WcifExtension {
  id?: string;
  specUrl?: string;
  data?: Record<string, unknown>;
}

export interface WcifAvatar {
  url?: string;
  thumbUrl?: string;
}

export interface WcifRoundResultsAttempt {
  result?: number;
  reconstruction?: string | null;
}

export interface WcifRoundResult {
  personId?: number;
  ranking?: number | null;
  attempts?: WcifRoundResultsAttempt[];
  best?: number;
  average?: number;
}

export interface WcifTimeLimit {
  centiseconds?: number;
  cumulativeRoundIds?: string[];
}

export interface WcifCutoff {
  numberOfAttempts?: number;
  attemptResult?: number;
}

export interface WcifAdvancementCondition {
  type?: "attemptResult" | "percent" | "ranking";
  level?: number;
}

export interface WcifRound {
  id?: string;
  format?: string;
  timeLimit?: WcifTimeLimit | null;
  cutoff?: WcifCutoff | null;
  advancementCondition?: WcifAdvancementCondition | null;
  results?: WcifRoundResult[];
  scrambleSets?: unknown[];
  scrambleSetCount?: number;
  extensions?: WcifExtension[];
}

export interface WcifCompetitionEvent {
  id?: string;
  rounds?: WcifRound[] | null;
  competitorLimit?: number | null;
  qualification?: Record<string, unknown> | null;
  extensions?: WcifExtension[];
}

export interface WcifActivity {
  id?: number;
  name?: string;
  activityCode?: string;
  startTime?: string;
  endTime?: string;
  childActivities?: WcifActivity[];
  extensions?: WcifExtension[];
}

export interface WcifRoom {
  id?: number;
  name?: string;
  color?: string;
  activities?: WcifActivity[];
}

export interface WcifVenue {
  id?: number;
  name?: string;
  latitudeMicrodegrees?: number;
  longitudeMicrodegrees?: number;
  countryIso2?: string;
  timezone?: string;
  rooms?: WcifRoom[];
  extensions?: WcifExtension[];
}

export interface WcifRegistration {
  wcaRegistrationId?: number;
  eventIds?: string[];
  status?: "accepted" | "deleted" | "pending";
  guests?: number;
  comments?: string;
  administrativeNotes?: string;
  isCompeting?: boolean;
}

export interface WcifAssignment {
  activityId?: number;
  stationNumber?: number | null;
  assignmentCode?: string;
}

export interface WcifPersonalBest {
  eventId?: string;
  best?: number;
  worldRanking?: number;
  continentalRanking?: number;
  nationalRanking?: number;
  type?: "single" | "average";
}

export interface WcifPerson {
  registrantId?: number | null;
  name?: string;
  wcaUserId?: number;
  wcaId?: string | null;
  countryIso2?: string;
  gender?: "m" | "f" | "o";
  birthdate?: string;
  email?: string;
  avatar?: WcifAvatar | null;
  roles?: string[];
  registration?: WcifRegistration | null;
  assignments?: WcifAssignment[];
  personalBests?: WcifPersonalBest[];
  extensions?: WcifExtension[];
}

export interface WcifSeries {
  id?: string | number;
  name?: string;
  shortName?: string;
  competitionIds?: string[];
}

export interface WcifSchedule {
  venues?: WcifVenue[];
  startDate?: string;
  numberOfDays?: number;
}

export interface WcifRegistrationInfo {
  openTime?: string;
  closeTime?: string;
  baseEntryFee?: number;
  currencyCode?: string;
  onTheSpotRegistration?: boolean;
  useWcaRegistration?: boolean;
}

export interface WcifCompetition {
  formatVersion?: string;
  id?: string;
  name?: string;
  shortName?: string;
  series?: WcifSeries | null;
  persons?: WcifPerson[];
  events?: WcifCompetitionEvent[];
  schedule?: WcifSchedule;
  competitorLimit?: number | null;
  extensions?: WcifExtension[];
  registrationInfo?: WcifRegistrationInfo;
}

export interface ExistingCompetitionEventState {
  id: string;
  hasLockedRoundStructure?: boolean;
}

export interface ExistingCompetitionState {
  id: string;
  startDate: string;
  numberOfDays: number;
  competitorLimit?: number | null;
  confirmed?: boolean;
  competitorLimitsEnabled?: boolean;
  seriesCompetitionIds?: string[];
  events?: ExistingCompetitionEventState[];
}

export interface CurrentUserPermissions {
  canUpdateCompetitionSeries?: boolean;
  canAddAndRemoveEvents?: boolean;
  canUpdateEvents?: boolean;
  canAdminCompetitions?: boolean;
}

export interface WcifValidationContext {
  competition: ExistingCompetitionState;
  permissions?: CurrentUserPermissions;
  allowedEventIds?: Iterable<string>;
  allowedFormatIds?: Iterable<string>;
  allowedTimezoneIds?: Iterable<string>;
  formatExpectedSolveCounts?: Record<string, number>;
}

export interface WcifValidationIssue {
  code: string;
  message: string;
  path: string;
}

export interface WcifValidationResult {
  ok: boolean;
  issues: WcifValidationIssue[];
}
