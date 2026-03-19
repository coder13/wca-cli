import { requestJson, type WcaRequestOptions } from "./api.ts";
import type {
  CompetitionSummary,
  CompetitionWcif,
  LiveRegistrationResponse,
  LiveRoundResults,
  LiveRoundsResponse,
  MyCompetitionsResponse,
  NextIfQuitResponse,
  PaymentTicketResponse,
  PermissionsResponse,
  SearchResponse,
  RegistrationHistoryEntry,
  RegistrationLaneConfig,
  RegistrationPaymentsResponse,
  RegistrationV2,
} from "./oauth-types.ts";

export interface ManagedCompetitionsOptions {
  q?: string;
}

export interface PaymentTicketOptions {
  isoDonationAmount?: number;
}

export interface NextIfQuitOptions {
  registrationId: number;
}

export type SearchScope =
  | "all"
  | "posts"
  | "competitions"
  | "users"
  | "persons"
  | "regulations"
  | "incidents";

export class WcaOauthClient {
  constructor(
    private readonly accessToken?: string,
    private readonly baseUrl?: string,
  ) {}

  async me() {
    return requestJson("/api/v0/me", this.options());
  }

  async myPermissions(): Promise<PermissionsResponse> {
    return requestJson("/api/v0/users/me/permissions", this.options());
  }

  async myCompetitions(): Promise<MyCompetitionsResponse> {
    return requestJson("/api/v0/competitions/mine", this.options());
  }

  async managedCompetitions(options: ManagedCompetitionsOptions = {}): Promise<CompetitionSummary[]> {
    const params = new URLSearchParams({ managed_by_me: "true" });

    if (options.q) {
      params.set("q", options.q);
    }

    return requestJson(`/api/v0/competitions?${params.toString()}`, this.options());
  }

  async competitionWcif(competitionId: string): Promise<CompetitionWcif> {
    return requestJson(
      `/api/v0/competitions/${encodeURIComponent(competitionId)}/wcif`,
      this.options(),
    );
  }

  async search(query: string, scope: SearchScope = "all"): Promise<SearchResponse> {
    const params = new URLSearchParams({ q: query });
    const suffix = scope === "all" ? "" : `/${scope}`;
    return requestJson(`/api/v0/search${suffix}?${params.toString()}`, this.publicOptions());
  }

  async registrationByCompetitionAndUser(
    competitionId: string,
    userId: number,
  ): Promise<RegistrationV2> {
    return requestJson(
      `/api/v1/competitions/${encodeURIComponent(competitionId)}/registrations/${userId}`,
      this.options(),
    );
  }

  async registration(registrationId: number): Promise<RegistrationV2> {
    return requestJson(`/api/v1/registrations/${registrationId}`, this.options());
  }

  async registrationConfig(competitionId: string): Promise<RegistrationLaneConfig[]> {
    return requestJson(
      `/api/v1/competitions/${encodeURIComponent(competitionId)}/registration_config`,
      this.options(),
    );
  }

  async adminRegistrations(competitionId: string): Promise<RegistrationV2[]> {
    return requestJson(
      `/api/v1/competitions/${encodeURIComponent(competitionId)}/registrations/admin`,
      this.options(),
    );
  }

  async paymentTicket(
    registrationId: number,
    options: PaymentTicketOptions = {},
  ): Promise<PaymentTicketResponse> {
    const params = new URLSearchParams();

    if (typeof options.isoDonationAmount === "number") {
      params.set("iso_donation_amount", String(options.isoDonationAmount));
    }

    const suffix = params.size > 0 ? `?${params.toString()}` : "";
    return requestJson(`/api/v1/registrations/${registrationId}/payment_ticket${suffix}`, this.options());
  }

  async registrationHistory(registrationId: number): Promise<RegistrationHistoryEntry[]> {
    return requestJson(`/api/v1/registrations/${registrationId}/history`, this.options());
  }

  async registrationPayments(registrationId: number): Promise<RegistrationPaymentsResponse> {
    return requestJson(`/api/v1/registrations/${registrationId}/payments`, this.options());
  }

  async nextIfQuit(
    competitionId: string,
    roundId: string,
    options: NextIfQuitOptions,
  ): Promise<NextIfQuitResponse> {
    const params = new URLSearchParams({
      registration_id: String(options.registrationId),
    });

    return requestJson(
      `/api/v1/competitions/${encodeURIComponent(competitionId)}/live/rounds/${encodeURIComponent(roundId)}/next_if_quit?${params.toString()}`,
      this.options(),
    );
  }

  async liveRound(competitionId: string, roundId: string): Promise<LiveRoundResults> {
    return requestJson(
      `/api/v1/competitions/${encodeURIComponent(competitionId)}/live/rounds/${encodeURIComponent(roundId)}`,
      this.publicOptions(),
    );
  }

  async liveRegistration(
    competitionId: string,
    registrationId: number,
  ): Promise<LiveRegistrationResponse> {
    return requestJson(
      `/api/v1/competitions/${encodeURIComponent(competitionId)}/live/registrations/${registrationId}`,
      this.publicOptions(),
    );
  }

  async livePodiums(competitionId: string): Promise<LiveRoundResults[]> {
    return requestJson(
      `/api/v1/competitions/${encodeURIComponent(competitionId)}/live/podiums`,
      this.publicOptions(),
    );
  }

  async liveRounds(competitionId: string): Promise<LiveRoundsResponse> {
    return requestJson(
      `/api/v1/competitions/${encodeURIComponent(competitionId)}/live/rounds`,
      this.publicOptions(),
    );
  }

  private options(): WcaRequestOptions {
    return {
      ...(this.accessToken ? { accessToken: this.accessToken } : {}),
      ...(this.baseUrl ? { baseUrl: this.baseUrl } : {}),
    };
  }

  private publicOptions(): WcaRequestOptions {
    return this.baseUrl ? { baseUrl: this.baseUrl } : {};
  }
}
