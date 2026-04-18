<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { formatSiliconId, formatTableValue } from '../../lib/formatters';
import { getModuleModalTitle, getModuleTotalVoltage } from '../../lib/module-state';

const props = defineProps({
    moduleId: {
        type: String,
        default: null
    },
    moduleState: {
        type: Object,
        required: true
    },
    moduleNamesBySiliconId: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['close']);

const moduleEntry = computed(() => (props.moduleId ? props.moduleState[props.moduleId] ?? {} : {}));
const cellHeaders = computed(() => Array.from({ length: 12 }, (_, index) => `Cell ${index + 1}`));
const cellRow = computed(() =>
    Array.from({ length: 12 }, (_, index) => formatTableValue(moduleEntry.value?.cells?.values?.[index], 3))
);
const thermHeaders = computed(() =>
    moduleEntry.value?.temp?.values?.length
        ? moduleEntry.value.temp.values.map((entry) => (entry.index === 7 ? 'Board Temp' : `T${entry.index}`))
        : Array.from({ length: 7 }, (_, index) => (index === 6 ? 'Board Temp' : `T${index + 1}`))
);
const thermRow = computed(() =>
    moduleEntry.value?.temp?.values?.length
        ? moduleEntry.value.temp.values.map((entry) => formatTableValue(entry.value, 1))
        : Array.from({ length: 7 }, () => '---')
);
const hasAnyData = computed(() =>
    cellRow.value.some((value) => value !== '---') || thermRow.value.some((value) => value !== '---')
);
const title = computed(() =>
    props.moduleId
        ? getModuleModalTitle(props.moduleId, moduleEntry.value, props.moduleNamesBySiliconId)
        : 'Module Details'
);
const averageCellVoltage = computed(() => formatTableValue(moduleEntry.value?.cells?.avg, 3));
const siliconId = computed(() => formatSiliconId(moduleEntry.value?.siliconId));
const totalVoltage = computed(() => formatTableValue(getModuleTotalVoltage(moduleEntry.value), 3));

function onWindowKeydown(event) {
    if (event.key === 'Escape' && props.moduleId) {
        emit('close');
    }
}

onMounted(() => {
    window.addEventListener('keydown', onWindowKeydown);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', onWindowKeydown);
});
</script>

<template>
    <div
        class="modal-backdrop"
        :hidden="!moduleId"
        @click.self="emit('close')"
    >
        <div v-if="moduleId" class="modal" role="dialog" aria-modal="true" aria-labelledby="moduleModalTitle">
            <div class="modal-header">
                <h3 id="moduleModalTitle">{{ title }}</h3>
                <button class="modal-close" type="button" @click="emit('close')">Close</button>
            </div>
            <div class="modal-meta-row">
                <p class="modal-meta">
                    <strong>Avg Cell Voltage:</strong>
                    <span class="modal-meta-value">{{ averageCellVoltage }} V</span>
                </p>
                <p class="modal-meta">
                    <strong>Total Voltage:</strong>
                    <span class="modal-meta-value">{{ totalVoltage }} V</span>
                </p>
                <p class="modal-meta">
                    <strong>Silicon ID:</strong>
                    <span class="modal-meta-value">{{ siliconId }}</span>
                </p>
            </div>
            <section class="modal-section">
                <h4>Cells</h4>
                <table class="detail-table" aria-label="Module cell readings">
                    <thead>
                        <tr>
                            <th v-for="header in cellHeaders" :key="header">{{ header }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td v-for="(value, index) in cellRow" :key="`cell-${index}`">{{ value }}</td>
                        </tr>
                    </tbody>
                </table>
            </section>
            <section class="modal-section">
                <h4>Thermistors</h4>
                <table class="detail-table" aria-label="Module thermistor readings">
                    <thead>
                        <tr>
                            <th v-for="header in thermHeaders" :key="header">{{ header }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td v-for="(value, index) in thermRow" :key="`therm-${index}`">{{ value }}</td>
                        </tr>
                    </tbody>
                </table>
            </section>
            <p v-if="!hasAnyData" class="modal-empty">No readings received for this module yet.</p>
        </div>
    </div>
</template>
