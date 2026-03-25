<script setup>
import ModuleGrid from '../components/module/ModuleGrid.vue';
import ModuleSummaryTile from '../components/module/ModuleSummaryTile.vue';
import ModuleTable from '../components/module/ModuleTable.vue';

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
    <section class="panel chart-container">
        <div class="view-panel">
            <div class="module-overview">
                <div class="module-visuals">
                    <ModuleSummaryTile :module-state="moduleState" />
                    <ModuleGrid
                        :module-state="moduleState"
                        :module-names-by-silicon-id="moduleNamesBySiliconId"
                        :balancing-state="balancingState"
                        :now="now"
                        @open-module="$emit('open-module', $event)"
                    />
                </div>
                <ModuleTable :module-state="moduleState" :now="now" />
            </div>
        </div>
    </section>
</template>
