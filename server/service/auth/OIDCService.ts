import { getRequestURL, type H3Event } from 'h3';
import * as client from 'openid-client';

import { IplayarrParameter } from '../../types/IplayarrParameters';
import { getIpSession } from '../../utils/session';
import configService from '../configService';

// Ported from the Express version: `req: Request` -> `event: H3Event`, session
// access via getIpSession (h3), and the request URL via getRequestURL(event).
// OIDC flow logic, PKCE, state payload and behaviour are otherwise unchanged.
class OIDCService {
    async oidcConnection(event: H3Event, configUrl: string, clientId: string, clientSecret: string, callback_host: string, mode: string = 'login'): Promise<string> {
        const config: client.Configuration = await client.discovery(
            new URL(configUrl),
            clientId,
            clientSecret,
        )

        const codeVerifier = client.randomPKCECodeVerifier()
        const code_challenge = await client.calculatePKCECodeChallenge(codeVerifier)
        const statePayload = {
            mode,
            details: { configUrl, clientId, clientSecret, callback_host },
            nonce: client.randomState()
        };
        const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

        const session = await getIpSession(event);
        await session.update({ codeVerifier, state });

        const parameters: Record<string, string> = {
            redirect_uri: `${callback_host}/auth/oidc/callback`,
            scope: 'openid profile email',
            code_challenge,
            code_challenge_method: 'S256',
            state
        }

        return client.buildAuthorizationUrl(config, parameters).toString();
    }

    async getAuthURL(event: H3Event): Promise<string | undefined> {
        const [configUrl, clientId, clientSecret, callbackHost] = (await configService.getParameters(
            IplayarrParameter.OIDC_CONFIG_URL,
            IplayarrParameter.OIDC_CLIENT_ID,
            IplayarrParameter.OIDC_CLIENT_SECRET,
            IplayarrParameter.OIDC_CALLBACK_HOST
        )) as string[];

        return await this.oidcConnection(event, configUrl, clientId, clientSecret, callbackHost);
    }

    async getUserEmail(event: H3Event, configUrl: string, clientId: string, clientSecret: string): Promise<string | undefined> {
        try {
            const config: client.Configuration = await client.discovery(
                new URL(configUrl),
                clientId,
                clientSecret,
            )

            const session = await getIpSession(event);
            const fullUrl = getRequestURL(event).href;
            const tokens: client.TokenEndpointResponse = await client.authorizationCodeGrant(
                config,
                new URL(fullUrl),
                {
                    pkceCodeVerifier: session.data.codeVerifier,
                    expectedState: session.data.state
                },
            )

            const serverMetadata = config.serverMetadata();

            const protectedResourceResponse: Response = await client.fetchProtectedResource(
                config,
                tokens.access_token,
                new URL(serverMetadata.userinfo_endpoint!),
                'GET',
            )

            const { email } = await protectedResourceResponse.json();

            return email;
        } catch (e: any) {
            console.error('OIDC validation error:', e);
            return;
        }
    }

    async validateUser(event: H3Event): Promise<string | undefined> {
        try {
            const [configUrl, clientId, clientSecret] = (await configService.getParameters(
                IplayarrParameter.OIDC_CONFIG_URL,
                IplayarrParameter.OIDC_CLIENT_ID,
                IplayarrParameter.OIDC_CLIENT_SECRET
            )) as string[];

            const config: client.Configuration = await client.discovery(
                new URL(configUrl),
                clientId,
                clientSecret,
            )

            const session = await getIpSession(event);
            const fullUrl = getRequestURL(event).href;
            const tokens: client.TokenEndpointResponse = await client.authorizationCodeGrant(
                config,
                new URL(fullUrl),
                {
                    pkceCodeVerifier: session.data.codeVerifier,
                    expectedState: session.data.state
                },
            )

            const serverMetadata = config.serverMetadata();

            const protectedResourceResponse: Response = await client.fetchProtectedResource(
                config,
                tokens.access_token,
                new URL(serverMetadata.userinfo_endpoint!),
                'GET',
            )

            const { email } = await protectedResourceResponse.json();

            return email;
        } catch (e: any) {
            console.error('OIDC validation error:', e);
            return;
        }
    }
}

export default new OIDCService();
