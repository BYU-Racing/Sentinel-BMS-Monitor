<script setup>
import { computed } from 'vue';
import { getStatusColor } from '../../lib/formatters';

const props = defineProps({
    label: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    }
});

const color = computed(() => getStatusColor(props.status));
</script>

<template>
    <div class="status-indicator">
        <span
            class="status-dot"
            :style="{ backgroundColor: color }"
            :title="status"
            :aria-label="`${label} status ${status}`"
        />
        <span>{{ label }}</span>
    </div>
</template>
