<script setup>
import { computed } from 'vue';
import LineChart from '../components/charts/LineChart.vue';
import { TEMPERATURE_SERIES, VOLTAGE_SERIES } from '../lib/constants';

const props = defineProps({
    chartLabels: {
        type: Array,
        required: true
    },
    chartSeries: {
        type: Object,
        required: true
    },
    chartBounds: {
        type: Object,
        required: true
    }
});

const voltageDatasets = computed(() =>
    VOLTAGE_SERIES.map((series) => ({
        key: series.key,
        label: series.label,
        color: series.color,
        data: props.chartSeries.voltage[series.key]
    }))
);

const temperatureDatasets = computed(() =>
    TEMPERATURE_SERIES.map((series) => ({
        key: series.key,
        label: series.label,
        color: series.color,
        data: props.chartSeries.temperature[series.key]
    }))
);
</script>

<template>
    <section class="panel chart-container">
        <div class="view-panel">
            <div class="chart-stack">
                <LineChart
                    title="Cell Voltages"
                    canvas-id="voltageChart"
                    :labels="chartLabels"
                    :series="voltageDatasets"
                    y-axis-title="Cells [V]"
                    :bounds="chartBounds.voltage"
                />
                <LineChart
                    title="Temperatures"
                    canvas-id="temperatureChart"
                    :labels="chartLabels"
                    :series="temperatureDatasets"
                    y-axis-title="Temps [C]"
                    :bounds="chartBounds.temperature"
                />
            </div>
        </div>
    </section>
</template>
