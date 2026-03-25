<script setup>
defineProps({
    summary: {
        type: String,
        default: ''
    },
    enabled: {
        type: Boolean,
        default: false
    },
    disabled: {
        type: Boolean,
        default: true
    }
});

defineEmits(['toggle']);
</script>

<template>
    <div class="balancing-controls">
        <span class="balancing-summary">{{ summary }}</span>
        <button class="balancing-button" type="button" :disabled="disabled" @click="$emit('toggle')">
            {{ enabled ? 'Balancing Off' : 'Balancing On' }}
        </button>
    </div>
</template>
