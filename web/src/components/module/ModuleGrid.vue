<script setup>
import { MODULE_IDS } from '../../lib/constants';
import ModuleCard from './ModuleCard.vue';

defineProps({
    moduleState: {
        type: Object,
        required: true
    },
    moduleNamesBySiliconId: {
        type: Object,
        required: true
    },
    balancingState: {
        type: Object,
        required: true
    },
    now: {
        type: Number,
        required: true
    }
});

defineEmits(['open-module']);
</script>

<template>
    <div class="module-grid">
        <ModuleCard
            v-for="moduleId in MODULE_IDS"
            :key="moduleId"
            :module-id="moduleId"
            :module-entry="moduleState[moduleId]"
            :module-names-by-silicon-id="moduleNamesBySiliconId"
            :balancing-state="balancingState"
            :now="now"
            @open="$emit('open-module', moduleId)"
        />
    </div>
</template>
