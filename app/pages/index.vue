<script setup>
// Preserves the original Vue Router redirect: { path: '/', redirect: '/queue' }.
await navigateTo('/queue', { redirectCode: 302 });
</script>

<template>
    <div />
</template>
