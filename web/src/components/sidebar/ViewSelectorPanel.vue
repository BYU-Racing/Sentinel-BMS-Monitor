<script setup>
import SidebarSection from '../layout/SidebarSection.vue';

defineProps({
    activeView: {
        type: String,
        required: true
    }
});

defineEmits(['change-view']);
</script>

<template>
    <SidebarSection>
        <div class="view-buttons">
            <button
                class="view-button"
                :class="{ active: activeView === 'moduleOverview' }"
                type="button"
                @click="$emit('change-view', 'moduleOverview')"
            >
                Module Overview
            </button>
            <button
                class="view-button"
                :class="{ active: activeView === 'packStats' }"
                type="button"
                @click="$emit('change-view', 'packStats')"
            >
                Pack Stats
            </button>
        </div>
    </SidebarSection>
</template>
