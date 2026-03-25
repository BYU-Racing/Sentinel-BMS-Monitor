<script setup>
import SidebarSection from '../layout/SidebarSection.vue';

defineProps({
    hasData: {
        type: Boolean,
        default: false
    }
});

defineEmits(['reset', 'export']);
</script>

<template>
    <SidebarSection>
        <div class="action-buttons">
            <button id="resetButton" type="button" :disabled="!hasData" @click="$emit('reset')">
                Reset Data
            </button>
            <button id="exportButton" type="button" :disabled="!hasData" @click="$emit('export')">
                Export CSV
            </button>
        </div>
    </SidebarSection>
</template>
