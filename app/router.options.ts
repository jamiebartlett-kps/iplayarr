import type { RouterConfig } from '@nuxt/schema';

// Mirrors the original router.js scrollBehavior exactly, including the
// (intentionally preserved) 'behaviour' typo from the original.
export default <RouterConfig>{
    scrollBehavior() {
        return { top: 0, behaviour: 'smooth' } as any;
    },
};
