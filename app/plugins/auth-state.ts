import { reactive } from 'vue';

// Parity with main.js: app.provide('authState', reactive({ user: null })).
// Provided both via vueApp.provide (so inject('authState') works in components,
// exactly like the original) and as $authState for the auth route middleware.
export default defineNuxtPlugin((nuxtApp) => {
    const authState = reactive({ user: null });
    nuxtApp.vueApp.provide('authState', authState);
    return {
        provide: { authState },
    };
});
