const portSelect = document.getElementById('portSelect');
const connectButton = document.getElementById('connectButton');
const disconnectButton = document.getElementById('disconnectButton');
const packStatsButton = document.getElementById('packStatsButton');
const moduleOverviewButton = document.getElementById('moduleOverviewButton');
const resetButton = document.getElementById('resetButton');
const exportButton = document.getElementById('exportButton');
const statusElement = document.getElementById('status');
const balancingSummary = document.getElementById('balancingSummary');
const balancingButton = document.getElementById('balancingButton');
const voltageChartElement = document.getElementById('voltageChart');
const temperatureChartElement = document.getElementById('temperatureChart');
const packStatsView = document.getElementById('packStatsView');
const moduleOverviewView = document.getElementById('moduleOverviewView');
const modulePackAverage = document.getElementById('modulePackAverage');
const modulePackTotal = document.getElementById('modulePackTotal');
const moduleGrid = document.getElementById('moduleGrid');
const moduleTableBody = document.getElementById('moduleTableBody');
const moduleModalBackdrop = document.getElementById('moduleModalBackdrop');
const moduleModalTitle = document.getElementById('moduleModalTitle');
const moduleModalClose = document.getElementById('moduleModalClose');
const moduleCellTableHead = document.getElementById('moduleCellTableHead');
const moduleCellTableBody = document.getElementById('moduleCellTableBody');
const moduleThermTableHead = document.getElementById('moduleThermTableHead');
const moduleThermTableBody = document.getElementById('moduleThermTableBody');
const moduleModalSiliconId = document.getElementById('moduleModalSiliconId');
const moduleModalEmpty = document.getElementById('moduleModalEmpty');

const statusDots = {
    bms: document.getElementById('statusDotBms'),
    board: document.getElementById('statusDotBoard'),
    voltage: document.getElementById('statusDotVoltage'),
    temp: document.getElementById('statusDotTemp')
};

const MV_TO_V = 0.001;
const BASE_VOLTAGE_RANGE = { min: 3.0, max: 4.2 };
const BASE_TEMPERATURE_RANGE = { min: 15, max: 60 };
const AXIS_PADDING = { voltage: 0.05, temperature: 2 };
const MODULE_IDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const CELL_VOLTAGE_DISPLAY_RANGE = { min: 2.8, max: 4.15 };
const MODULE_STALE_MS = 15000;
const STATUS_COLORS = {
    GOOD: '#22c55e',
    WARNING: '#eab308',
    EXHAUSTED: '#f97316',
    ERROR: '#ef4444',
    READY: '#2563eb',
    BAD_DATA: '#a855f7',
    DISCONNECTED: '#cbd2d9'
};

const VOLTAGE_SERIES = [
    { key: 'cell_min_v', label: 'Cell Min [V]', color: '#2563eb' },
    { key: 'cell_max_v', label: 'Cell Max [V]', color: '#f97316' },
    { key: 'cell_avg_v', label: 'Cell Avg [V]', color: '#10b981' }
];

const TEMPERATURE_SERIES = [
    { key: 'temp_min_c', label: 'T1-T6 Min', color: '#ec4899' },
    { key: 'temp_max_c', label: 'T1-T6 Max', color: '#8b5cf6' },
    { key: 'temp_avg_c', label: 'T1-T6 Avg', color: '#f59e0b' },
    { key: 'temp7_avg_c', label: 'T7 Avg', color: '#06b6d4' }
];

const ALL_SERIES = [...VOLTAGE_SERIES, ...TEMPERATURE_SERIES];

let isConnected = false;
let activeView = 'moduleOverview';
let activeModuleModalId = null;
const voltageDatasets = new Map();
const temperatureDatasets = new Map();
const isoTimestamps = [];
const moduleState = new Map();
const statusState = {
    bms: 'DISCONNECTED',
    board: 'DISCONNECTED',
    voltage: 'DISCONNECTED',
    temp: 'DISCONNECTED'
};
const balancingState = {
    activeCells: new Set(),
    enabled: false
};
let moduleNamesBySiliconId = {};

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

function createVoltageScales() {
    return {
        x: createBaseXAxis(),
        y: {
            type: 'linear',
            position: 'left',
            min: BASE_VOLTAGE_RANGE.min,
            max: BASE_VOLTAGE_RANGE.max,
            title: {
                display: true,
                text: 'Cells [V]'
            },
            ticks: {
                precision: 2
            }
        }
    };
}

function createTemperatureScales() {
    return {
        x: createBaseXAxis(),
        y: {
            type: 'linear',
            position: 'left',
            min: BASE_TEMPERATURE_RANGE.min,
            max: BASE_TEMPERATURE_RANGE.max,
            title: {
                display: true,
                text: 'Temps [C]'
            },
            ticks: {
                precision: 2
            }
        }
    };
}

function createChart(canvas, scales) {
    return new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                mode: 'nearest',
                intersect: false
            },
            scales
        }
    });
}

const voltageChart = createChart(voltageChartElement, createVoltageScales());
const temperatureChart = createChart(temperatureChartElement, createTemperatureScales());

function initializeDatasets(chart, datasetMap, seriesDefinitions) {
    chart.data.datasets = seriesDefinitions.map((series) => {
        const dataset = {
            label: series.label,
            data: [],
            borderColor: series.color,
            backgroundColor: `${series.color}33`,
            tension: 0.25,
            fill: false,
            spanGaps: true,
            pointRadius: 2
        };

        datasetMap.set(series.key, dataset);
        return dataset;
    });
}

function updateConnectAvailability() {
    const hasSelection = Boolean(portSelect.value);
    connectButton.disabled = isConnected || !hasSelection;
}

function updateDataButtons() {
    const hasData = isoTimestamps.length > 0;
    resetButton.disabled = !hasData;
    exportButton.disabled = !hasData;
}

function parseReadingLine(line) {
    const normalizedLine = line.trim().replace(/^-\s*/, '');
    const match = normalizedLine.match(
        /^module\s+(\d+)\s+(cells\[mV\]|temp\[C\])\s+min=(-?\d+(?:\.\d+)?)\s+max=(-?\d+(?:\.\d+)?)\s+avg=(-?\d+(?:\.\d+)?)(?:\s+(.*))?$/i
    );
    if (!match) {
        return null;
    }

    const [, moduleId, readingType, minValue, maxValue, avgValue, remainder = ''] = match;
    const values = [];
    const valuePattern = /([CT])(\d+):\s*(-?\d+(?:\.\d+)?)/g;
    let valueMatch;

    while ((valueMatch = valuePattern.exec(remainder)) !== null) {
        values.push({
            prefix: valueMatch[1].toUpperCase(),
            index: Number(valueMatch[2]),
            value: Number(valueMatch[3])
        });
    }

    return {
        moduleId,
        readingType: readingType.toLowerCase(),
        min: Number(minValue),
        max: Number(maxValue),
        avg: Number(avgValue),
        values
    };
}

function parseStatusLine(line) {
    const normalizedLine = line.trim().replace(/^-\s*/, '');
    const match = normalizedLine.match(/^status\s+(BMS|board|voltage|temp):\s*([A-Z_]+)$/i);
    if (!match) {
        return null;
    }

    return {
        target: match[1].toLowerCase(),
        value: match[2].toUpperCase()
    };
}

function parseBalancingLine(line) {
    const normalizedLine = line.trim().replace(/^-\s*/, '');
    if (!normalizedLine.startsWith('balancing ')) {
        return null;
    }

    if (normalizedLine === 'balancing off') {
        return {
            enabled: false,
            activeCells: []
        };
    }

    const activeCells = [];
    const pairPattern = /(\d+)-(\d+)/g;
    let match;

    while ((match = pairPattern.exec(normalizedLine)) !== null) {
        activeCells.push(`${Number(match[1])}-${Number(match[2])}`);
    }

    return {
        enabled: activeCells.length > 0,
        activeCells
    };
}

function parseModuleSiliconIdsLine(line) {
    const normalizedLine = line.trim().replace(/^-\s*/, '');
    const match = normalizedLine.match(/^module\s+silicon\s+ids:\s*(.*)$/i);
    if (!match) {
        return null;
    }

    const rawIds = match[1]
        .trim()
        .split(/\s+/)
        .slice(0, MODULE_IDS.length);

    return MODULE_IDS.map((moduleId, index) => ({
        moduleId,
        siliconId: rawIds[index] ?? '-'
    }));
}

function updateModuleState(parsedLine) {
    const moduleEntry = moduleState.get(parsedLine.moduleId) ?? {};
    moduleEntry.updatedAt = Date.now();

    if (parsedLine.readingType === 'cells[mv]') {
        const cellValues = Array.from({ length: 12 }, () => null);
        parsedLine.values
            .filter((entry) => entry.prefix === 'C' && Number.isFinite(entry.value))
            .forEach((entry) => {
                if (entry.index >= 1 && entry.index <= 12) {
                    cellValues[entry.index - 1] = entry.value * MV_TO_V;
                }
            });
        const validAverageCells = cellValues.filter((value) => value >= 1 && value <= 6);

        moduleEntry.cells = {
            min: parsedLine.min * MV_TO_V,
            max: parsedLine.max * MV_TO_V,
            avg: summarizeValues(validAverageCells)?.avg ?? null,
            values: cellValues
        };
    }

    if (parsedLine.readingType === 'temp[c]') {
        const temps = new Map();
        parsedLine.values.forEach((entry) => {
            if (entry.prefix === 'T' && Number.isFinite(entry.value)) {
                temps.set(entry.index, entry.value);
            }
        });

        const t1To6 = [1, 2, 3, 4, 5, 6]
            .map((index) => temps.get(index))
            .filter((value) => Number.isFinite(value));
        const validAverageTemps = t1To6.filter((value) => value > 0);
        const allValues = Array.from(temps.entries())
            .sort((left, right) => left[0] - right[0])
            .map(([index, value]) => ({ index, value }));

        moduleEntry.temp = {
            min: parsedLine.min,
            max: parsedLine.max,
            avg: summarizeValues(validAverageTemps)?.avg ?? null,
            t1To6,
            t7: temps.get(7),
            values: allValues
        };
    }

    moduleState.set(parsedLine.moduleId, moduleEntry);
}

function updateModuleSiliconIds(entries) {
    entries.forEach(({ moduleId, siliconId }) => {
        const moduleEntry = moduleState.get(moduleId) ?? {};
        moduleEntry.siliconId = siliconId;
        moduleState.set(moduleId, moduleEntry);
    });
}

function getStatusColor(status) {
    return STATUS_COLORS[status] ?? STATUS_COLORS.DISCONNECTED;
}

function renderStatusIndicators() {
    Object.entries(statusDots).forEach(([key, element]) => {
        const status = statusState[key];
        element.style.backgroundColor = getStatusColor(status);
        element.title = status;
        element.setAttribute('aria-label', `${key} status ${status}`);
    });
}

function renderBalancingState() {
    const balancingCount = balancingState.activeCells.size;
    if (!balancingState.enabled || balancingCount === 0) {
        balancingSummary.textContent = '';
    } else {
        const label = balancingCount === 1 ? 'Cell' : 'Cells';
        balancingSummary.textContent = `${balancingCount} ${label} Balancing`;
    }
    balancingButton.textContent = balancingState.enabled ? 'Balancing Off' : 'Balancing On';
    balancingButton.disabled = !isConnected;
}

function voltageColorForValue(value) {
    if (!Number.isFinite(value)) {
        return '#d2d6dc';
    }

    if (value >= 3.1 && value <= 4.15) {
        return '#22c55e';
    }

    if ((value >= 2.8 && value <= 3.09) || (value >= 4.16 && value <= 4.2)) {
        return '#eab308';
    }

    if (value >= 2.55 && value < 2.8) {
        return '#f97316';
    }

    return '#ef4444';
}

function tempColorForValue(value) {
    if (!Number.isFinite(value)) {
        return '#cbd2d9';
    }

    if (value <= 50) {
        return '#22c55e';
    }

    if (value < 60) {
        return '#eab308';
    }

    if (value < 70) {
        return '#f97316';
    }

    return '#ef4444';
}

function cellHeightForVoltage(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }

    const clamped = Math.min(CELL_VOLTAGE_DISPLAY_RANGE.max, Math.max(CELL_VOLTAGE_DISPLAY_RANGE.min, value));
    const normalized =
        (clamped - CELL_VOLTAGE_DISPLAY_RANGE.min) /
        (CELL_VOLTAGE_DISPLAY_RANGE.max - CELL_VOLTAGE_DISPLAY_RANGE.min);

    return Math.round(normalized * 84);
}

function isModuleStale(moduleEntry) {
    if (!moduleEntry?.updatedAt) {
        return true;
    }

    return Date.now() - moduleEntry.updatedAt > MODULE_STALE_MS;
}

function formatCellTooltip(moduleId, index, value) {
    if (!Number.isFinite(value)) {
        return `Module ${moduleId} Cell ${index}: ---`;
    }

    return `Module ${moduleId} Cell ${index}: ${value.toFixed(3)} V`;
}

function formatTempTooltip(moduleId, value) {
    if (!Number.isFinite(value)) {
        return `Module ${moduleId} max temp: ---`;
    }

    return `Module ${moduleId} max temp: ${value.toFixed(1)} C`;
}

function formatModuleTooltip(moduleId, value) {
    if (!Number.isFinite(value)) {
        return `Module ${moduleId} average voltage: ---`;
    }

    return `Module ${moduleId} average voltage: ${value.toFixed(3)} V`;
}

function formatSiliconId(value) {
    if (!value || value === '-') {
        return '---';
    }

    return value;
}

function getModuleName(moduleEntry) {
    const siliconId = formatSiliconId(moduleEntry?.siliconId);
    if (siliconId === '---') {
        return '';
    }

    const name = moduleNamesBySiliconId[siliconId];
    return typeof name === 'string' ? name.trim() : '';
}

function getModuleCardLabel(moduleEntry) {
    return getModuleName(moduleEntry) || formatSiliconId(moduleEntry?.siliconId);
}

function getModuleModalTitle(moduleId, moduleEntry) {
    return `M${moduleId} ${getModuleName(moduleEntry) || formatSiliconId(moduleEntry?.siliconId)} Details`;
}

function createCellBar(moduleId, index, value) {
    const bar = document.createElement('div');
    bar.className = 'cell-bar';
    bar.style.height = `${cellHeightForVoltage(value)}px`;
    bar.style.backgroundColor = voltageColorForValue(value);
    bar.title = formatCellTooltip(moduleId, index, value);
    if (balancingState.activeCells.has(`${moduleId}-${index}`)) {
        bar.classList.add('balancing');
    }
    return bar;
}

function openModuleModal(moduleId) {
    if (!MODULE_IDS.includes(String(moduleId))) {
        return;
    }

    renderModuleModal(String(moduleId));
}

function createModuleCard(moduleId) {
    const moduleEntry = moduleState.get(moduleId);
    const cellValues = Array.from({ length: 12 }, (_, index) => moduleEntry?.cells?.values?.[index] ?? null);
    const maxTemp = moduleEntry?.temp?.max;
    const avgVoltage = moduleEntry?.cells?.avg;
    const cardLabel = getModuleCardLabel(moduleEntry);

    const card = document.createElement('div');
    card.className = 'module-card';
    card.dataset.moduleId = moduleId;
    card.title = formatModuleTooltip(moduleId, avgVoltage);
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Open details for module ${moduleId}`);
    if (isModuleStale(moduleEntry)) {
        card.classList.add('stale');
    }

    card.addEventListener('click', () => {
        openModuleModal(moduleId);
    });
    card.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
            return;
        }

        event.preventDefault();
        openModuleModal(moduleId);
    });

    const batteryShell = document.createElement('div');
    batteryShell.className = 'battery-shell';

    const batteryTip = document.createElement('div');
    batteryTip.className = 'battery-tip';
    batteryTip.style.backgroundColor = tempColorForValue(maxTemp);
    batteryTip.title = formatTempTooltip(moduleId, maxTemp);

    const batteryBody = document.createElement('div');
    batteryBody.className = 'battery-body';
    cellValues.forEach((value, index) => {
        batteryBody.appendChild(createCellBar(moduleId, index + 1, value));
    });

    batteryShell.append(batteryTip, batteryBody);

    const siliconLabel = document.createElement('div');
    siliconLabel.className = 'module-silicon-id';
    siliconLabel.textContent = cardLabel;
    siliconLabel.title = `Module ${moduleId}: ${cardLabel}`;

    card.append(batteryShell, siliconLabel);
    return card;
}

function formatTableValue(value, digits = 3) {
    if (!Number.isFinite(value)) {
        return '---';
    }

    return value.toFixed(digits);
}

function clearElement(element) {
    element.innerHTML = '';
}

function createDetailRow(values, headerTag = 'td') {
    const row = document.createElement('tr');
    values.forEach((value) => {
        const cell = document.createElement(headerTag);
        cell.textContent = value;
        row.appendChild(cell);
    });
    return row;
}

function renderModuleModal(moduleId) {
    activeModuleModalId = moduleId;
    const moduleEntry = moduleState.get(moduleId);
    const siliconId = formatSiliconId(moduleEntry?.siliconId);
    moduleModalTitle.textContent = getModuleModalTitle(moduleId, moduleEntry);
    moduleModalSiliconId.textContent = siliconId;
    clearElement(moduleCellTableHead);
    clearElement(moduleCellTableBody);
    clearElement(moduleThermTableHead);
    clearElement(moduleThermTableBody);

    const cellValues = moduleEntry?.cells?.values ?? [];
    const tempValues = moduleEntry?.temp?.values ?? [];

    const cellHeaders = Array.from({ length: 12 }, (_value, index) => `Cell ${index + 1}`);
    const cellRow = Array.from({ length: 12 }, (_value, index) => formatTableValue(cellValues[index], 3));
    moduleCellTableHead.appendChild(createDetailRow(cellHeaders, 'th'));
    moduleCellTableBody.appendChild(createDetailRow(cellRow));

    if (tempValues.length) {
        moduleThermTableHead.appendChild(createDetailRow(tempValues.map((entry) => `T${entry.index}`), 'th'));
        moduleThermTableBody.appendChild(
            createDetailRow(tempValues.map((entry) => formatTableValue(entry.value, 1)))
        );
    } else {
        const thermHeaders = Array.from({ length: 7 }, (_value, index) => `T${index + 1}`);
        moduleThermTableHead.appendChild(createDetailRow(thermHeaders, 'th'));
        moduleThermTableBody.appendChild(createDetailRow(Array.from({ length: 7 }, () => '---')));
    }

    const hasAnyData =
        cellValues.some((value) => Number.isFinite(value)) ||
        tempValues.some((entry) => Number.isFinite(entry.value));
    moduleModalEmpty.hidden = hasAnyData;
    moduleModalBackdrop.hidden = false;
}

function closeModuleModal() {
    activeModuleModalId = null;
    moduleModalBackdrop.hidden = true;
}

function createModuleTableRow(moduleId) {
    const moduleEntry = moduleState.get(moduleId);
    const row = document.createElement('tr');
    row.dataset.moduleId = moduleId;

    if (isModuleStale(moduleEntry)) {
        row.classList.add('stale-row');
    }

    const values = [
        `Module ${moduleId}`,
        formatTableValue(moduleEntry?.cells?.avg, 3),
        formatTableValue(moduleEntry?.cells?.min, 3),
        formatTableValue(moduleEntry?.cells?.max, 3),
        formatTableValue(moduleEntry?.temp?.avg, 1),
        formatTableValue(moduleEntry?.temp?.min, 1),
        formatTableValue(moduleEntry?.temp?.max, 1)
    ];

    values.forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
    });

    return row;
}

function renderModulePackSummary() {
    const connectedCellValues = [];

    moduleState.forEach((moduleEntry) => {
        if (!moduleEntry?.cells?.values?.length) {
            return;
        }

        connectedCellValues.push(
            ...moduleEntry.cells.values.filter((value) => Number.isFinite(value) && value <= 5.5)
        );
    });

    const summary = summarizeValues(connectedCellValues);
    if (!summary || !connectedCellValues.length) {
        modulePackAverage.textContent = '---V';
        modulePackTotal.textContent = '---V';
        return;
    }

    const averagePerCell = summary.avg;
    const totalPackVoltage = averagePerCell * connectedCellValues.length;
    modulePackAverage.textContent = `${averagePerCell.toFixed(2)}V`;
    modulePackTotal.textContent = `${totalPackVoltage.toFixed(1)}V`;
}

function renderModuleOverview() {
    moduleGrid.innerHTML = '';
    moduleTableBody.innerHTML = '';
    MODULE_IDS.forEach((moduleId) => {
        moduleGrid.appendChild(createModuleCard(moduleId));
    });

    MODULE_IDS.forEach((moduleId) => {
        moduleTableBody.appendChild(createModuleTableRow(moduleId));
    });
    renderModulePackSummary();
}

function refreshModuleOverviewState() {
    MODULE_IDS.forEach((moduleId) => {
        const moduleEntry = moduleState.get(moduleId);
        const card = moduleGrid.querySelector(`.module-card[data-module-id="${moduleId}"]`);
        const row = moduleTableBody.querySelector(`tr[data-module-id="${moduleId}"]`);
        const stale = isModuleStale(moduleEntry);

        if (card) {
            card.classList.toggle('stale', stale);
        }

        if (row) {
            row.classList.toggle('stale-row', stale);
        }
    });
}

function setActiveView(view) {
    activeView = view;
    const showingPackStats = view === 'packStats';

    packStatsButton.classList.toggle('active', showingPackStats);
    moduleOverviewButton.classList.toggle('active', !showingPackStats);
    packStatsView.hidden = !showingPackStats;
    moduleOverviewView.hidden = showingPackStats;

    if (showingPackStats) {
        voltageChart.resize();
        temperatureChart.resize();
    }
}

function summarizeValues(values) {
    if (!values.length) {
        return null;
    }

    const total = values.reduce((sum, value) => sum + value, 0);
    return {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: total / values.length
    };
}

function buildSummarySnapshot() {
    const allCellValues = [];
    const allTempValues = [];
    const allT7Values = [];
    const validAverageCellValues = [];
    const validAverageTempValues = [];
    const validAverageT7Values = [];

    moduleState.forEach((moduleEntry) => {
        if (moduleEntry.cells?.values?.length) {
            allCellValues.push(...moduleEntry.cells.values);
            validAverageCellValues.push(...moduleEntry.cells.values.filter((value) => value >= 1 && value <= 6));
        }

        if (moduleEntry.temp?.t1To6?.length) {
            allTempValues.push(...moduleEntry.temp.t1To6);
            validAverageTempValues.push(...moduleEntry.temp.t1To6.filter((value) => value > 0));
        }

        if (Number.isFinite(moduleEntry.temp?.t7)) {
            allT7Values.push(moduleEntry.temp.t7);
            if (moduleEntry.temp.t7 > 0) {
                validAverageT7Values.push(moduleEntry.temp.t7);
            }
        }
    });

    const cellSummary = summarizeValues(allCellValues);
    const tempSummary = summarizeValues(allTempValues);
    const t7Summary = summarizeValues(allT7Values);
    const cellAverageSummary = summarizeValues(validAverageCellValues);
    const tempAverageSummary = summarizeValues(validAverageTempValues);
    const t7AverageSummary = summarizeValues(validAverageT7Values);

    return {
        cell_min_v: cellSummary?.min ?? null,
        cell_max_v: cellSummary?.max ?? null,
        cell_avg_v: cellAverageSummary?.avg ?? null,
        temp_min_c: tempSummary?.min ?? null,
        temp_max_c: tempSummary?.max ?? null,
        temp_avg_c: tempAverageSummary?.avg ?? null,
        temp7_avg_c: t7AverageSummary?.avg ?? null
    };
}

function appendSnapshot(snapshot, timestamp) {
    const iso = timestamp.toISOString();
    const label = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    isoTimestamps.push(iso);
    voltageChart.data.labels.push(label);
    temperatureChart.data.labels.push(label);

    VOLTAGE_SERIES.forEach((series) => {
        voltageDatasets.get(series.key).data.push(snapshot[series.key]);
    });

    TEMPERATURE_SERIES.forEach((series) => {
        temperatureDatasets.get(series.key).data.push(snapshot[series.key]);
    });
}

function valuesForSeries(snapshot, seriesDefinitions) {
    return seriesDefinitions
        .map((series) => snapshot[series.key])
        .filter((value) => Number.isFinite(value));
}

function updateChartBounds(chart, values, baseRange, padding) {
    if (!values.length) {
        chart.options.scales.y.min = baseRange.min;
        chart.options.scales.y.max = baseRange.max;
        return;
    }

    const observedMin = Math.min(...values);
    const observedMax = Math.max(...values);

    chart.options.scales.y.min = observedMin < baseRange.min ? observedMin - padding : baseRange.min;
    chart.options.scales.y.max = observedMax > baseRange.max ? observedMax + padding : baseRange.max;
}

function syncCharts(snapshot) {
    updateChartBounds(
        voltageChart,
        valuesForSeries(snapshot, VOLTAGE_SERIES),
        BASE_VOLTAGE_RANGE,
        AXIS_PADDING.voltage
    );
    updateChartBounds(
        temperatureChart,
        valuesForSeries(snapshot, TEMPERATURE_SERIES),
        BASE_TEMPERATURE_RANGE,
        AXIS_PADDING.temperature
    );

    voltageChart.update('none');
    temperatureChart.update('none');
}

window.serialAPI.onPorts((ports) => {
    const previousSelection = portSelect.value;
    portSelect.innerHTML = '';

    if (!ports.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No serial ports found';
        option.disabled = true;
        option.selected = true;
        portSelect.appendChild(option);
        statusElement.textContent = 'No serial ports detected. Plug in a device to get started.';
        portSelect.disabled = true;
        updateConnectAvailability();
        return;
    }

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select a serial port';
    placeholder.disabled = true;
    portSelect.appendChild(placeholder);

    let matchedSelection = false;

    ports.forEach((port) => {
        const option = document.createElement('option');
        option.value = port.path;
        option.textContent = port.label ? `${port.label} (${port.path})` : port.path;
        if (previousSelection && previousSelection === port.path) {
            option.selected = true;
            matchedSelection = true;
        }
        portSelect.appendChild(option);
    });

    if (!matchedSelection) {
        placeholder.selected = true;
    }

    if (!isConnected) {
        portSelect.disabled = false;
        statusElement.textContent = matchedSelection
            ? `Ready to connect to ${previousSelection}`
            : 'Select a serial port to connect.';
    }

    updateConnectAvailability();
});

window.serialAPI.onStatus((status) => {
    isConnected = Boolean(status?.connected);

    if (isConnected) {
        const portPath = status?.path || portSelect.value;
        statusElement.textContent = `Connected to ${portPath}. Listening for logs...`;
        portSelect.disabled = true;
        connectButton.disabled = true;
        disconnectButton.disabled = false;
        renderBalancingState();
    } else {
        statusElement.textContent = 'Disconnected. Select a serial port to connect again.';
        portSelect.disabled = false;
        disconnectButton.disabled = true;
        Object.keys(statusState).forEach((key) => {
            statusState[key] = 'DISCONNECTED';
        });
        balancingState.activeCells.clear();
        balancingState.enabled = false;
        renderStatusIndicators();
        renderBalancingState();
        updateConnectAvailability();
    }
});

window.serialAPI.onLog((payload) => {
    const message = payload?.message;
    if (typeof message !== 'string') {
        return;
    }

    const parsedStatus = parseStatusLine(message);
    if (parsedStatus) {
        if (Object.prototype.hasOwnProperty.call(statusState, parsedStatus.target)) {
            statusState[parsedStatus.target] = parsedStatus.value;
            renderStatusIndicators();
        }
        return;
    }

    const parsedBalancing = parseBalancingLine(message);
    if (parsedBalancing) {
        balancingState.activeCells = new Set(parsedBalancing.activeCells);
        balancingState.enabled = parsedBalancing.enabled;
        renderBalancingState();
        renderModuleOverview();
        return;
    }

    const parsedModuleSiliconIds = parseModuleSiliconIdsLine(message);
    if (parsedModuleSiliconIds) {
        updateModuleSiliconIds(parsedModuleSiliconIds);
        renderModuleOverview();
        if (activeModuleModalId) {
            renderModuleModal(activeModuleModalId);
        }
        return;
    }

    const parsedLine = parseReadingLine(message);
    if (!parsedLine) {
        return;
    }

    updateModuleState(parsedLine);
    renderModuleOverview();
    if (activeModuleModalId === parsedLine.moduleId) {
        renderModuleModal(parsedLine.moduleId);
    }

    const timestamp = new Date();
    const snapshot = buildSummarySnapshot();

    appendSnapshot(snapshot, timestamp);
    syncCharts(snapshot);
    updateDataButtons();
});

portSelect.addEventListener('change', () => {
    updateConnectAvailability();
});

connectButton.addEventListener('click', async () => {
    const selectedPort = portSelect.value;
    if (!selectedPort) {
        statusElement.textContent = 'Please select a serial port before connecting.';
        return;
    }

    statusElement.textContent = `Connecting to ${selectedPort}...`;
    connectButton.disabled = true;
    portSelect.disabled = true;

    try {
        await window.serialAPI.connect(selectedPort);
    } catch (error) {
        console.error('Failed to connect to serial port:', error);
        statusElement.textContent = `Failed to connect: ${error?.message ?? error}`;
        portSelect.disabled = false;
        updateConnectAvailability();
    }
});

disconnectButton.addEventListener('click', async () => {
    disconnectButton.disabled = true;
    await window.serialAPI.disconnect();
});

packStatsButton.addEventListener('click', () => {
    setActiveView('packStats');
});

moduleOverviewButton.addEventListener('click', () => {
    setActiveView('moduleOverview');
});

balancingButton.addEventListener('click', async () => {
    const nextCommand = balancingState.enabled ? 'balancing off' : 'balancing on';

    try {
        await window.serialAPI.send(nextCommand);
    } catch (error) {
        console.error('Failed to send balancing command:', error);
        statusElement.textContent = `Failed to send balancing command: ${error?.message ?? error}`;
    }
});

moduleModalClose.addEventListener('click', () => {
    closeModuleModal();
});

moduleModalBackdrop.addEventListener('click', (event) => {
    if (event.target === moduleModalBackdrop) {
        closeModuleModal();
    }
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !moduleModalBackdrop.hidden) {
        closeModuleModal();
    }
});

resetButton.addEventListener('click', () => {
    moduleState.clear();
    Object.keys(statusState).forEach((key) => {
        statusState[key] = 'DISCONNECTED';
    });
    balancingState.activeCells.clear();
    balancingState.enabled = false;
    isoTimestamps.length = 0;
    voltageChart.data.labels = [];
    temperatureChart.data.labels = [];
    voltageChart.data.datasets.forEach((dataset) => {
        dataset.data = [];
    });
    temperatureChart.data.datasets.forEach((dataset) => {
        dataset.data = [];
    });
    voltageChart.options.scales = createVoltageScales();
    temperatureChart.options.scales = createTemperatureScales();
    voltageChart.update();
    temperatureChart.update();
    renderStatusIndicators();
    renderBalancingState();
    renderModuleOverview();
    closeModuleModal();
    updateDataButtons();
});

exportButton.addEventListener('click', () => {
    if (!isoTimestamps.length) {
        return;
    }

    const header = ['timestamp', ...ALL_SERIES.map((series) => series.label)].join(',');
    const rows = isoTimestamps.map((iso, index) => {
        const columns = ALL_SERIES.map((series) => {
            const dataset = voltageDatasets.get(series.key) ?? temperatureDatasets.get(series.key);
            const value = dataset?.data[index];
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
});

initializeDatasets(voltageChart, voltageDatasets, VOLTAGE_SERIES);
initializeDatasets(temperatureChart, temperatureDatasets, TEMPERATURE_SERIES);
renderStatusIndicators();
renderBalancingState();
renderModuleOverview();
setActiveView(activeView);
voltageChart.update('none');
temperatureChart.update('none');
updateDataButtons();
window.serialAPI
    .loadModuleNames()
    .then((moduleNames) => {
        moduleNamesBySiliconId = moduleNames && typeof moduleNames === 'object' ? moduleNames : {};
        renderModuleOverview();
        if (activeModuleModalId) {
            renderModuleModal(activeModuleModalId);
        }
    })
    .catch((error) => {
        console.error('Failed to load module names:', error);
    });

setInterval(() => {
    if (activeView === 'moduleOverview') {
        refreshModuleOverviewState();
    }
}, 1000);
