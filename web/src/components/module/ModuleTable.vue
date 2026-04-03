<script setup>
import { computed } from 'vue';
import FaultIcon from '../icons/FaultIcon.vue';
import { MODULE_IDS } from '../../lib/constants';
import { formatTableValue, isModuleStale } from '../../lib/formatters';
import { getFaultKinds } from '../../lib/faults';

const props = defineProps({
    moduleState: {
        type: Object,
        required: true
    },
    moduleFaultsById: {
        type: Object,
        required: true
    },
    now: {
        type: Number,
        required: true
    }
});

const rows = computed(() =>
    MODULE_IDS.map((moduleId) => {
        const moduleEntry = props.moduleState[moduleId] ?? {};
        return {
            moduleId,
            stale: isModuleStale(moduleEntry, props.now),
            faults: props.moduleFaultsById[moduleId] ?? [],
            faultKinds: getFaultKinds(props.moduleFaultsById[moduleId] ?? []),
            values: [
                formatTableValue(moduleEntry?.cells?.avg, 3),
                formatTableValue(moduleEntry?.cells?.min, 3),
                formatTableValue(moduleEntry?.cells?.max, 3),
                formatTableValue(moduleEntry?.temp?.avg, 1),
                formatTableValue(moduleEntry?.temp?.min, 1),
                formatTableValue(moduleEntry?.temp?.max, 1)
            ]
        };
    })
);
</script>

<template>
    <div class="module-table-wrap">
        <table class="module-table" aria-label="Module statistics table">
            <thead>
                <tr>
                    <th>Module</th>
                    <th>V Avg</th>
                    <th>V Min</th>
                    <th>V Max</th>
                    <th>T Avg</th>
                    <th>T Min</th>
                    <th>T Max</th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="row in rows"
                    :key="row.moduleId"
                    :data-module-id="row.moduleId"
                    :class="{ 'stale-row': row.stale }"
                >
                    <td class="module-name-cell">
                        <span>Module {{ row.moduleId }}</span>
                        <span v-if="row.faultKinds.length" class="module-fault-icons" :title="row.faults.map((fault) => fault.text).join('\n')">
                            <FaultIcon
                                v-for="faultType in row.faultKinds"
                                :key="`${row.moduleId}-${faultType}`"
                                :type="faultType"
                                :title="faultType"
                            />
                        </span>
                    </td>
                    <td v-for="(value, index) in row.values" :key="`${row.moduleId}-${index}`">
                        {{ value }}
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
