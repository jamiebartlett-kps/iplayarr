import { library } from '@fortawesome/fontawesome-svg-core';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

// Parity with main.js: library.add(fas, fab) + global FontAwesomeIcon component.
export default defineNuxtPlugin((nuxtApp) => {
    library.add(fas);
    library.add(fab);
    nuxtApp.vueApp.component('FontAwesomeIcon', FontAwesomeIcon);
});
