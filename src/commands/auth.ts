import type { Command } from "commander";
import { getCurrentUser, loginSelectedProfile } from "../lib/auth/service.ts";
import {
  createProfile,
  deleteProfile,
  listProfiles,
  showProfile,
  useProfile,
} from "./profile.ts";
import { writeSuccess } from "../lib/output.ts";

export async function login(profileName?: string): Promise<void> {
  const profile = await loginSelectedProfile(profileName);
  writeSuccess({
    profile: profile.name,
    loggedIn: true,
  });
}

export async function status(profileName?: string): Promise<void> {
  writeSuccess(await getCurrentUser(profileName));
}

export function registerAuthCommands(program: Command): void {
  const auth = program.command("auth").description("Authenticate using the configured app");

  auth.command("list")
    .description("List saved auth profiles")
    .action(async () => {
      await listProfiles();
    });

  auth.command("show")
    .description("Show one auth profile")
    .argument("[profile]", "Profile name")
    .action(async (profileName?: string) => {
      await showProfile(profileName);
    });

  auth.command("add")
    .description("Add a new auth profile and immediately log it in")
    .action(async () => {
      const profile = await createProfile();
      await login(profile.name);
    });

  auth.command("use")
    .description("Set the default auth profile")
    .argument("<profile>", "Profile name")
    .action(async (profileName: string) => {
      await useProfile(profileName);
    });

  auth.command("login")
    .description("Log in the default profile or a named profile")
    .argument("[profile]", "Profile name")
    .action(async (profileName?: string) => {
      await login(profileName);
    });

  auth.command("status")
    .description("Fetch /api/v0/me for the default profile or a named profile")
    .argument("[profile]", "Profile name")
    .action(async (profileName?: string) => {
      await status(profileName);
    });
  auth.command("remove")
    .description("Remove an auth profile")
    .argument("<profile>", "Profile name")
    .action(async (profileName: string) => {
      await deleteProfile(profileName);
    });
}
