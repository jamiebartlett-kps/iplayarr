import { getRequestHost, getRequestProtocol } from 'h3';

import OIDCService from '../../../service/auth/OIDCService';
import configService from '../../../service/configService';
import { IplayarrParameter } from '../../../types/IplayarrParameters';
import { ApiError } from '../../../types/responses/ApiResponse';
import { getIpSession } from '../../../utils/session';

export default defineEventHandler(async (event) => {
    const allowedEmailsList = (await configService.getParameter(IplayarrParameter.OIDC_ALLOWED_EMAILS)) || '';
    const allowedEmails = allowedEmailsList.split(',').map((email) => email.trim().toLowerCase());
    const query = getQuery(event);
    const code = query.code as string;
    const session = await getIpSession(event);
    const codeVerifier = session.data.codeVerifier;

    if (!code || !codeVerifier) {
        setResponseStatus(event, 400);
        return { error: ApiError.INVALID_INPUT };
    }

    const stateParam = query.state as string;
    const stateData = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
    const isTest = stateData.mode === 'test';
    const email: string | undefined = isTest
        ? await OIDCService.getUserEmail(
              event,
              stateData.details.configUrl,
              stateData.details.clientId,
              stateData.details.clientSecret
          )
        : await OIDCService.validateUser(event);
    const validUser = email && allowedEmails.includes(email.toLowerCase());

    if (isTest) {
        return `
    <html>
      <body>
        <script>
          const channel = new BroadcastChannel('oidc-test');
          channel.postMessage({
            type: 'oidc-test-result',
            success: true,
            email: "${email}"
          });
          setTimeout(() => window.close(), 500);
        </script>
        <p>You can close this tab.</p>
      </body>
    </html>
`;
    }

    if (!validUser) {
        setResponseStatus(event, 401);
        return { error: ApiError.INVALID_CREDENTIALS };
    } else {
        await session.update({ user: { username: email } });
        const host =
            process.env.DEBUG == 'true'
                ? `${getRequestProtocol(event)}://${getRequestHost(event)?.split(':')[0]}:8080`
                : '';
        return sendRedirect(event, `${host}/queue`);
    }
});
