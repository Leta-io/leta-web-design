import type { AvatarTone } from '@leta-io/components';

/**
 * The signed-in dispatcher — a single source of truth for the account's identity
 * across the whole app: the TopBar / User Menu, the Activity-tab comment composer,
 * and every activity-trail entry attributed to "me" (comments I post, dispatches /
 * reassignments / cancellations I perform).
 *
 * **Avatar logic (important):** the user's avatar is their `tone`-coloured monogram
 * by default, but if the account has an uploaded photo (`avatarSrc`), that image is
 * shown everywhere the user's avatar appears instead — the design-system `Avatar`
 * renders `src` when present and falls back to the `tone` initials on load error.
 * Set `avatarSrc` here (one place) and it propagates to the TopBar, the composer,
 * and every "me" entry in the timeline.
 */
export interface CurrentUser {
  name: string;
  email: string;
  /** Monogram background tone, used when there is no uploaded photo. */
  tone: AvatarTone;
  /** Uploaded profile photo URL. When set, shown in place of the monogram. */
  avatarSrc?: string;
}

export const CURRENT_USER: CurrentUser = {
  name: 'Alvin Simuiki',
  email: 'alvinsumuki@gmail.com',
  tone: 'teal',
  // No uploaded photo → teal monogram ("AS"). Set to an image URL to show a
  // photo everywhere the user's avatar renders.
  avatarSrc: undefined,
};
