<script setup>
import StatusIndicator from './StatusIndicator.vue';

defineProps({
    items: {
        type: Array,
        required: true
    }
});
</script>

<template>
    <div class="status-indicators" aria-label="System status indicators">
        <StatusIndicator
            v-for="item in items"
            :key="item.key"
            :label="item.label"
            :status="item.status"
        />
    </div>
</template>
