export type PlatformGoogleOAuthProfile = {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type PlatformGoogleOAuthStatePayload = {
  nonce: string;
  type: 'platform_google_oauth_state';
};
