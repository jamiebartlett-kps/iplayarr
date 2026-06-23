import VueApexCharts from 'vue3-apexcharts';

// Parity with main.js: app.use(VueApexCharts) -> global <apexchart> component.
// Client-only: ApexCharts depends on the browser (window).
export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.use(VueApexCharts);
});
