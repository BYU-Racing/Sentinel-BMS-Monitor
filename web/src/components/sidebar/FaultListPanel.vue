<script setup>
import FaultIcon from '../icons/FaultIcon.vue';
import SidebarSection from '../layout/SidebarSection.vue';

defineProps({
    faults: {
        type: Array,
        required: true
    }
});
</script>

<template>
    <SidebarSection>
        <div class="fault-panel">
            <div class="fault-panel-header">Active Faults</div>
            <p v-if="faults.length === 0" class="fault-panel-empty">
                No active faults detected.
            </p>
            <ul v-else class="fault-list">
                <li v-for="fault in faults" :key="`${fault.type}-${fault.moduleId ?? 'pack'}-${fault.detailIndex ?? 'all'}-${fault.text}`" class="fault-list-item">
                    <FaultIcon :type="fault.type" :title="fault.text" />
                    <span>{{ fault.text }}</span>
                </li>
            </ul>
        </div>
    </SidebarSection>
</template>
