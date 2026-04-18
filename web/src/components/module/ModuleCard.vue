<script setup>
import { computed } from 'vue';
import { cellHeightForVoltage, formatCellTooltip, formatModuleSummaryTooltip, formatTempTooltip, isModuleStale, tempColorForValue, voltageColorForValue } from '../../lib/formatters';
import { getModuleCardLabel } from '../../lib/module-state';
import { getModuleTotalVoltage } from '../../lib/module-state';

const props = defineProps({
    moduleId: {
        type: String,
        required: true
    },
    moduleEntry: {
        type: Object,
        default: () => ({})
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

const emit = defineEmits(['open']);

const cellValues = computed(() =>
    Array.from({ length: 12 }, (_, index) => props.moduleEntry?.cells?.values?.[index] ?? null)
);
const label = computed(() => getModuleCardLabel(props.moduleEntry, props.moduleNamesBySiliconId));
const stale = computed(() => isModuleStale(props.moduleEntry, props.now));
const tooltip = computed(() =>
    formatModuleSummaryTooltip(
        props.moduleId,
        props.moduleEntry?.cells?.avg,
        getModuleTotalVoltage(props.moduleEntry)
    )
);

function openCard() {
    emit('open', props.moduleId);
}

function onKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openCard();
    }
}
</script>

<template>
    <div
        class="module-card"
        :class="{ stale }"
        :data-module-id="moduleId"
        :title="tooltip"
        tabindex="0"
        role="button"
        :aria-label="`Open details for module ${moduleId}`"
        @click="openCard"
        @keydown="onKeydown"
    >
        <div class="battery-shell">
            <div
                class="battery-tip"
                :style="{ backgroundColor: tempColorForValue(moduleEntry?.temp?.max) }"
                :title="formatTempTooltip(moduleId, moduleEntry?.temp?.max)"
            />
            <div class="battery-body">
                <div
                    v-for="(value, index) in cellValues"
                    :key="`${moduleId}-${index + 1}`"
                    class="cell-bar"
                    :class="{ balancing: balancingState.activeCells.includes(`${moduleId}-${index + 1}`) }"
                    :style="{
                        height: `${cellHeightForVoltage(value)}px`,
                        backgroundColor: voltageColorForValue(value)
                    }"
                    :title="formatCellTooltip(moduleId, index + 1, value)"
                />
            </div>
        </div>
        <div class="module-silicon-id" :title="`Module ${moduleId}: ${label}`">
            {{ label }}
        </div>
    </div>
</template>
