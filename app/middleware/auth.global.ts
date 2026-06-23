import { getHost } from '@/lib/utils';

// Ported from router.js router.beforeEach. Runs client-side only to preserve the
// original SPA guard timing (the original fetched /auth/me in the browser). The
// shared authState comes from the auth-state plugin ($authState).
export default defineNuxtRouteMiddleware(async (to) => {
    if (!import.meta.client) {
        return;
    }
    if (to.path == '/login') {
        return;
    }

    const { $authState } = useNuxtApp() as any;

    try {
        const res = await fetch(`${getHost()}/auth/me`, { credentials: 'include' });
        if (res.ok) {
            $authState.user = await res.json();
        } else {
            $authState.user = null;
            return navigateTo('/login');
        }
    } catch {
        $authState.user = null;
        return navigateTo('/login');
    }
});
