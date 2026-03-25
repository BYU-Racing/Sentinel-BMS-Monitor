import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import {
    ALL_SERIES,
    AXIS_PADDING,
    BASE_TEMPERATURE_RANGE,
    BASE_VOLTAGE_RANGE,
    MODULE_IDS,
    TEMPERATURE_SERIES,
    VOLTAGE_SERIES
} from '../lib/constants';
import { createEmptyModuleState, updateModuleEntry, applyModuleSiliconIds, buildSummarySnapshot } from '../lib/module-state';

function createStatusState() {
    return {
        bms: 'DISCONNECTED',
        board: 'DISCONNECTED',
        voltage: 'DISCONNECTED',
        temp: 'DISCONNECTED'
    };
}

function createEmptyChartSeries(seriesDefinitions) {
    return seriesDefinitions.reduce((accumulator, series) => {
        accumulator[series.key] = [];
        return accumulator;
    }, {});
}

export function useSerialMonitor() {
    const ports = ref([]);
    const selectedPort = ref('');
    const isConnected = ref(false);
    const statusMessage = ref('Scanning for serial ports...');
    const activeView = ref('moduleOverview');
    const activeModuleModalId = ref(null);
    const isoTimestamps = ref([]);
    const chartLabels = ref([]);
    const now = ref(Date.now());
    const moduleNamesBySiliconId = ref({});

    const moduleState = reactive(createEmptyModuleState());
    const statusState = reactive(createStatusState());
    const balancingState = reactive({
        activeCells: [],
        enabled: false
    });
    const chartSeries = reactive({
        voltage: createEmptyChartSeries(VOLTAGE_SERIES),
        temperature: createEmptyChartSeries(TEMPERATURE_SERIES)
    });
    const chartBounds = reactive({
        voltage: { ...BASE_VOLTAGE_RANGE },
        temperature: { ...BASE_TEMPERATURE_RANGE }
    });

    let staleTimerId = null;
    let unsubscribePorts = null;
    let unsubscribeStatus = null;
    let unsubscribeData = null;

    const hasData = computed(() => isoTimestamps.value.length > 0);
    const canConnect = computed(() => Boolean(selectedPort.value) && !isConnected.value);
    const balancingSummary = computed(() => {
        const count = balancingState.activeCells.length;
        if (!balancingState.enabled || count === 0) {
            return '';
        }

        return `${count} ${count === 1 ? 'Cell' : 'Cells'} Balancing`;
    });

    function updateChartBounds(target, values, baseRange, padding) {
        if (!values.length) {
            chartBounds[target].min = baseRange.min;
            chartBounds[target].max = baseRange.max;
            return;
        }

        const observedMin = Math.min(...values);
        const observedMax = Math.max(...values);
        chartBounds[target].min = observedMin < baseRange.min ? observedMin - padding : baseRange.min;
        chartBounds[target].max = observedMax > baseRange.max ? observedMax + padding : baseRange.max;
    }

    function syncChartBounds(snapshot) {
        const voltageValues = VOLTAGE_SERIES.map((series) => snapshot[series.key]).filter((value) => Number.isFinite(value));
        const temperatureValues = TEMPERATURE_SERIES.map((series) => snapshot[series.key]).filter((value) => Number.isFinite(value));

        updateChartBounds('voltage', voltageValues, BASE_VOLTAGE_RANGE, AXIS_PADDING.voltage);
        updateChartBounds('temperature', temperatureValues, BASE_TEMPERATURE_RANGE, AXIS_PADDING.temperature);
    }

    function appendSnapshot(snapshot, timestamp) {
        const iso = timestamp.toISOString();
        const label = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        isoTimestamps.value = [...isoTimestamps.value, iso];
        chartLabels.value = [...chartLabels.value, label];

        VOLTAGE_SERIES.forEach((series) => {
            chartSeries.voltage[series.key] = [...chartSeries.voltage[series.key], snapshot[series.key]];
        });

        TEMPERATURE_SERIES.forEach((series) => {
            chartSeries.temperature[series.key] = [...chartSeries.temperature[series.key], snapshot[series.key]];
        });
    }

    function handlePorts(nextPorts) {
        ports.value = Array.isArray(nextPorts) ? nextPorts : [];
        const previousSelection = selectedPort.value;
        const hasPreviousSelection = ports.value.some((port) => port.path === previousSelection);

        if (!hasPreviousSelection) {
            selectedPort.value = '';
        }

        if (!ports.value.length) {
            statusMessage.value = 'No serial ports detected. Plug in a device to get started.';
            return;
        }

        if (!isConnected.value) {
            statusMessage.value = hasPreviousSelection
                ? `Ready to connect to ${previousSelection}`
                : 'Select a serial port to connect.';
        }
    }

    function handleDisconnected() {
        isConnected.value = false;
        statusMessage.value = 'Disconnected. Select a serial port to connect again.';
        Object.assign(statusState, createStatusState());
        balancingState.activeCells = [];
        balancingState.enabled = false;
    }

    function handleStatus(status) {
        isConnected.value = Boolean(status?.connected);

        if (isConnected.value) {
            const portPath = status?.path || selectedPort.value;
            statusMessage.value = `Connected to ${portPath}. Listening for logs...`;
            return;
        }

        handleDisconnected();
    }

    function handleSerialData(message) {
        if (!message || typeof message !== 'object') {
            return;
        }

        if (message.type === 'status-update') {
            if (Object.prototype.hasOwnProperty.call(statusState, message.payload?.target)) {
                statusState[message.payload.target] = message.payload.value;
            }
            return;
        }

        if (message.type === 'balancing-update') {
            balancingState.activeCells = message.payload?.activeCells ?? [];
            balancingState.enabled = Boolean(message.payload?.enabled);
            return;
        }

        if (message.type === 'module-silicon-ids') {
            applyModuleSiliconIds(moduleState, Array.isArray(message.payload) ? message.payload : []);
            return;
        }

        if (message.type !== 'module-reading' || !message.payload) {
            return;
        }

        updateModuleEntry(moduleState, message.payload);

        const timestamp = new Date();
        const snapshot = buildSummarySnapshot(moduleState);
        appendSnapshot(snapshot, timestamp);
        syncChartBounds(snapshot);
    }

    async function connect() {
        if (!selectedPort.value) {
            statusMessage.value = 'Please select a serial port before connecting.';
            return;
        }

        statusMessage.value = `Connecting to ${selectedPort.value}...`;
        try {
            await window.serialAPI.connect(selectedPort.value);
        } catch (error) {
            statusMessage.value = `Failed to connect: ${error?.message ?? error}`;
        }
    }

    async function disconnect() {
        await window.serialAPI.disconnect();
    }

    async function toggleBalancing() {
        const nextCommand = balancingState.enabled ? 'balancing off' : 'balancing on';

        try {
            await window.serialAPI.send(nextCommand);
        } catch (error) {
            statusMessage.value = `Failed to send balancing command: ${error?.message ?? error}`;
        }
    }

    function resetData() {
        Object.keys(moduleState).forEach((moduleId) => {
            moduleState[moduleId] = {};
        });
        Object.assign(statusState, createStatusState());
        balancingState.activeCells = [];
        balancingState.enabled = false;
        activeModuleModalId.value = null;
        isoTimestamps.value = [];
        chartLabels.value = [];

        Object.keys(chartSeries.voltage).forEach((key) => {
            chartSeries.voltage[key] = [];
        });
        Object.keys(chartSeries.temperature).forEach((key) => {
            chartSeries.temperature[key] = [];
        });

        chartBounds.voltage.min = BASE_VOLTAGE_RANGE.min;
        chartBounds.voltage.max = BASE_VOLTAGE_RANGE.max;
        chartBounds.temperature.min = BASE_TEMPERATURE_RANGE.min;
        chartBounds.temperature.max = BASE_TEMPERATURE_RANGE.max;
    }

    function exportCsv() {
        if (!isoTimestamps.value.length) {
            return;
        }

        const header = ['timestamp', ...ALL_SERIES.map((series) => series.label)].join(',');
        const rows = isoTimestamps.value.map((iso, index) => {
            const columns = ALL_SERIES.map((series) => {
                const dataset = chartSeries.voltage[series.key] ?? chartSeries.temperature[series.key];
                const value = dataset?.[index];
                return value === null || value === undefined ? '' : value;
            });
            return [iso, ...columns].join(',');
        });

        const csvContent = [header, ...rows].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `serial-log-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    function setActiveView(view) {
        activeView.value = view;
    }

    function openModuleModal(moduleId) {
        if (MODULE_IDS.includes(String(moduleId))) {
            activeModuleModalId.value = String(moduleId);
        }
    }

    function closeModuleModal() {
        activeModuleModalId.value = null;
    }

    onMounted(() => {
        unsubscribePorts = window.serialAPI.onPorts(handlePorts);
        unsubscribeStatus = window.serialAPI.onStatus(handleStatus);
        unsubscribeData = window.serialAPI.onData(handleSerialData);
        staleTimerId = window.setInterval(() => {
            now.value = Date.now();
        }, 1000);

        window.serialAPI
            .loadModuleNames()
            .then((moduleNames) => {
                moduleNamesBySiliconId.value =
                    moduleNames && typeof moduleNames === 'object' ? moduleNames : {};
            })
            .catch(() => {
                moduleNamesBySiliconId.value = {};
            });
    });

    onBeforeUnmount(() => {
        unsubscribePorts?.();
        unsubscribeStatus?.();
        unsubscribeData?.();
        if (staleTimerId) {
            window.clearInterval(staleTimerId);
        }
    });

    return {
        activeModuleModalId,
        activeView,
        balancingState,
        balancingSummary,
        canConnect,
        chartBounds,
        chartLabels,
        chartSeries,
        closeModuleModal,
        connect,
        disconnect,
        exportCsv,
        hasData,
        isConnected,
        moduleNamesBySiliconId,
        moduleState,
        now,
        openModuleModal,
        ports,
        resetData,
        selectedPort,
        setActiveView,
        statusMessage,
        statusState,
        toggleBalancing
    };
}
