import { fileURLToPath } from 'node:url';

// Absolute path to the Less variables so they can be auto-injected into every
// SFC <style lang="less"> block (mirrors the original vue.config.mjs
// css.loaderOptions.less.additionalData behaviour). global.less is loaded once
// as a global stylesheet below — the original injected it into every component,
// but the effective (computed) styling is identical when loaded once.
const lessVariables = fileURLToPath(new URL('./app/assets/styles/variables.less', import.meta.url));

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    // Q1/D2: SSR runtime enabled, but all data fetching stays on the client to
    // preserve the original SPA's fetch timing and avoid hydration mismatches
    // with browser-only code (Socket.IO, BroadcastChannel, window).
    ssr: true,

    compatibilityDate: '2025-01-01',

    modules: ['@vite-pwa/nuxt'],

    css: ['~/assets/styles/global.less'],

    app: {
        head: {
            title: 'iPlayarr',
            htmlAttrs: { lang: '' },
            meta: [
                { charset: 'utf-8' },
                { 'http-equiv': 'X-UA-Compatible', content: 'IE=edge' },
                {
                    name: 'viewport',
                    content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
                },
            ],
            link: [
                { rel: 'icon', href: '/favicon.ico' },
                { rel: 'apple-touch-icon', href: '/iplayarr.png' },
            ],
        },
    },

    vite: {
        css: {
            preprocessorOptions: {
                less: {
                    additionalData: `@import "${lessVariables}";`,
                },
            },
        },
    },

    // Q4/D13: PWA parity with the original vue-cli PWA plugin.
    pwa: {
        registerType: 'autoUpdate',
        manifest: {
            name: 'iPlayarr',
            short_name: 'iPlayarr',
            theme_color: '#202020',
            background_color: '#202020',
        },
        client: {
            installPrompt: false,
        },
    },

    typescript: {
        // Keep parity work unblocked; the original code was not strict-clean.
        strict: false,
    },
});
