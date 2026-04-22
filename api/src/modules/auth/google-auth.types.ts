export type GoogleOAuthProfile = {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type GoogleOAuthStatePayload = {
  nonce: string;
  type: 'google_oauth_state';
};
