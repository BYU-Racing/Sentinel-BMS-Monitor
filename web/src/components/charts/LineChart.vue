<script setup>
import { Chart, registerables } from 'chart.js';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

Chart.register(...registerables);

const props = defineProps({
    title: {
        type: String,
        required: true
    },
    canvasId: {
        type: String,
        required: true
    },
    labels: {
        type: Array,
        required: true
    },
    series: {
        type: Array,
        required: true
    },
    yAxisTitle: {
        type: String,
        required: true
    },
    bounds: {
        type: Object,
        required: true
    }
});

const canvasRef = ref(null);
let chart = null;

const datasets = computed(() =>
    props.series.map((entry) => ({
        label: entry.label,
        data: entry.data,
        borderColor: entry.color,
        backgroundColor: `${entry.color}33`,
        tension: 0.25,
        fill: false,
        spanGaps: true,
        pointRadius: 2
    }))
);

function createBaseXAxis() {
    return {
        title: {
            display: true,
            text: 'Timestamp'
        },
        ticks: {
            autoSkip: true,
            maxRotation: 0,
            minRotation: 0
        }
    };
}

function renderChart() {
    if (!canvasRef.value) {
        return;
    }

    chart = new Chart(canvasRef.value.getContext('2d'), {
        type: 'line',
        data: {
            labels: props.labels,
            datasets: datasets.value
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                mode: 'nearest',
                intersect: false
            },
            scales: {
                x: createBaseXAxis(),
                y: {
                    type: 'linear',
                    position: 'left',
                    min: props.bounds.min,
                    max: props.bounds.max,
                    title: {
                        display: true,
                        text: props.yAxisTitle
                    },
                    ticks: {
                        precision: 2
                    }
                }
            }
        }
    });
}

watch(
    () => [props.labels, datasets.value, props.bounds.min, props.bounds.max],
    () => {
        if (!chart) {
            return;
        }

        chart.data.labels = props.labels;
        chart.data.datasets = datasets.value;
        chart.options.scales.y.min = props.bounds.min;
        chart.options.scales.y.max = props.bounds.max;
        chart.update('none');
    },
    { deep: true }
);

onMounted(() => {
    renderChart();
});

onBeforeUnmount(() => {
    chart?.destroy();
});
</script>

<template>
    <section class="chart-panel">
        <h2>{{ title }}</h2>
        <canvas :id="canvasId" ref="canvasRef" :aria-label="title" />
    </section>
</template>
