import type { WcifCompetition } from "./wcif-types.ts";

export type WcaPermissionsScope = "*" | unknown[];

export interface CompetitionSummary {
  id: string;
  name: string;
  website: string | null;
  start_date: string | null;
  end_date: string | null;
  registration_open: string | null;
  registration_close?: string | null;
  url: string;
  city: string | null;
  country_iso2: string | null;
  competitor_limit?: number | null;
  results_posted?: boolean;
  visible?: boolean;
  confirmed?: boolean;
  cancelled?: boolean;
  report_posted?: boolean;
  short_display_name: string;
  registration_status: string | null;
  championships: Record<string, unknown>[];
}

export interface PermissionEntry {
  scope: WcaPermissionsScope;
  until?: string | null;
}

export interface PermissionsResponse {
  can_attend_competitions?: PermissionEntry;
  can_organize_competitions?: PermissionEntry;
  can_administer_competitions?: PermissionEntry;
  can_view_delegate_admin_page?: PermissionEntry;
  can_view_delegate_report?: PermissionEntry;
  can_edit_delegate_report?: PermissionEntry;
  can_create_groups?: PermissionEntry;
  can_read_groups_current?: PermissionEntry;
  can_read_groups_past?: PermissionEntry;
  can_edit_groups?: PermissionEntry;
  can_access_panels?: PermissionEntry;
  can_request_to_edit_others_profile?: PermissionEntry;
  [key: string]: PermissionEntry | undefined;
}

export interface RegistrationUser {
  id: number;
  wca_id: string | null;
  name: string;
  gender: string;
  country_iso2: string;
  country: Record<string, unknown> | string;
  dob?: string;
  email?: string;
}

export interface RegistrationPaymentSummary {
  has_paid?: boolean;
  payment_status?: string | null;
  paid_amount_iso?: number;
  currency_code?: string;
  updated_at?: string | null;
}

export interface RegistrationCompetingSummary {
  event_ids?: string[];
  comments?: string | null;
  registration_status?:
    | "pending"
    | "accepted"
    | "rejected"
    | "deleted"
    | "cancelled"
    | "waiting_list"
    | "non_competing";
  registered_on?: string | null;
  comment?: string;
  admin_comment?: string;
  waiting_list_position?: number;
}

export interface RegistrationV2 {
  id: number;
  user: RegistrationUser;
  user_id: number;
  registrant_id: number | null;
  guests?: number;
  payment?: RegistrationPaymentSummary;
  competing?: RegistrationCompetingSummary;
}

export type RegistrationLaneKey = "requirements" | "competing" | "payment" | "approval";

export interface RegistrationLaneConfig {
  key: RegistrationLaneKey;
  isEditable: boolean;
  deadline: string;
  parameters?: Record<string, unknown>;
}

export interface RegistrationHistoryEntry {
  changes: Record<string, unknown>;
  timestamp: string;
  action: string;
}

export interface RegistrationPaymentV2 {
  user_id: number;
  payment_id: number | string | null;
  payment_provider: string | null;
  iso_amount_payment: number;
  currency_code: string;
  iso_amount_refundable: number;
  refunding_payments: RegistrationPaymentV2[];
}

export type CompetitionWcif = WcifCompetition;

export interface LiveCompetitor {
  id: number;
  user_id: number;
  registrant_id: number | null;
  name: string;
  country_iso2: string;
}

export interface LiveRoundResults extends Record<string, unknown> {
  round_id: number;
  competitors: LiveCompetitor[];
  results: Record<string, unknown>[];
  state_hash: string;
  linked_round_ids: string[] | null;
}

export interface LiveRoundInfo extends Record<string, unknown> {
  state: string;
  total_competitors?: number;
  competitors_live_results_entered?: number;
}

export interface MyCompetitionsResponse {
  past_competitions: CompetitionSummary[];
  future_competitions: CompetitionSummary[];
  bookmarked_competitions: CompetitionSummary[];
  registrations_by_competition: Record<string, string>;
}

export interface PaymentTicketResponse {
  client_secret: string;
}

export interface RegistrationPaymentsResponse {
  charges: RegistrationPaymentV2[];
}

export interface NextIfQuitResponse {
  status: string;
  next_advancing: Record<string, unknown>[];
}

export interface LiveRegistrationResponse extends Record<string, unknown> {
  results: Record<string, unknown>[];
}

export interface LiveRoundsResponse {
  rounds: LiveRoundInfo[];
}

export interface SearchResponse {
  result: Record<string, unknown>[];
}
