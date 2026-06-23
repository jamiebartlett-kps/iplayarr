import { createVfm } from 'vue-final-modal';

// Parity with main.js: app.use(createVfm()). Stylesheet wired via nuxt.config css.
export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.use(createVfm());
});
