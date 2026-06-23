import { createHash } from 'node:crypto';

import type { H3Event } from 'h3';

import User from '../types/User';

// h3 session data shape, matching the original express-session SessionData.
export interface IpSessionData {
    user?: User;
    codeVerifier?: string;
    state?: string;
}

// h3's useSession requires a password >= 32 chars. The original SESSION_SECRET
// may be shorter (default 'default_secret_key'), so derive a stable 64-char key
// from it. Q2: a one-time re-login on deploy is accepted, so the cookie format
// differs from express-session's signed `connect.sid`.
function sessionPassword(): string {
    const secret = process.env.SESSION_SECRET || 'default_secret_key';
    return createHash('sha256').update(secret).digest('hex');
}

const isDebug = process.env.DEBUG == 'true';
const MAX_AGE = 60 * 60 * 24; // 24h, matching the original cookie maxAge.

// Cookie name kept as the original 'connect.sid'. secure:false and (in debug)
// sameSite:'lax' mirror the original express-session cookie settings.
export function getIpSession(event: H3Event) {
    return useSession<IpSessionData>(event, {
        name: 'connect.sid',
        password: sessionPassword(),
        maxAge: MAX_AGE,
        cookie: {
            secure: false,
            sameSite: isDebug ? 'lax' : undefined,
            maxAge: MAX_AGE,
        },
    });
}
