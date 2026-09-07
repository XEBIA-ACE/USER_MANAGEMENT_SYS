export interface IdpProvider {
  id: string;
  displayName: string;
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope: string;
}

export interface IdpProvidersResponse {
  providers: IdpProvider[];
}

export interface IdpProvidersErrorResponse {
  error?: string;
  message?: string;
}
