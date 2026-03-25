<script setup>
import { computed } from 'vue';
import { buildPackSummary } from '../../lib/module-state';

const props = defineProps({
    moduleState: {
        type: Object,
        required: true
    }
});

const summary = computed(() => buildPackSummary(props.moduleState));
const averagePerCellText = computed(() =>
    Number.isFinite(summary.value.averagePerCell) ? `${summary.value.averagePerCell.toFixed(2)}V` : '---V'
);
const totalPackText = computed(() =>
    Number.isFinite(summary.value.totalPackVoltage) ? `${summary.value.totalPackVoltage.toFixed(1)}V` : '---V'
);
</script>

<template>
    <div class="module-summary-tile">
        <div class="module-summary-metric">
            <span class="module-pack-value">{{ averagePerCellText }}</span>
            <span class="module-pack-label">Avg Per Cell</span>
        </div>
        <div class="module-summary-metric">
            <span class="module-pack-value">{{ totalPackText }}</span>
            <span class="module-pack-label">Total Pack Voltage</span>
        </div>
    </div>
</template>
