import {
    CELL_VOLTAGE_DISPLAY_RANGE,
    MODULE_STALE_MS,
    STATUS_COLORS
} from './constants';

export function summarizeValues(values) {
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

export function getStatusColor(status) {
    return STATUS_COLORS[status] ?? STATUS_COLORS.DISCONNECTED;
}

export function voltageColorForValue(value) {
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

export function tempColorForValue(value) {
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

export function cellHeightForVoltage(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }

    const clamped = Math.min(CELL_VOLTAGE_DISPLAY_RANGE.max, Math.max(CELL_VOLTAGE_DISPLAY_RANGE.min, value));
    const normalized =
        (clamped - CELL_VOLTAGE_DISPLAY_RANGE.min) /
        (CELL_VOLTAGE_DISPLAY_RANGE.max - CELL_VOLTAGE_DISPLAY_RANGE.min);

    return Math.round(normalized * 84);
}

export function isModuleStale(moduleEntry, now = Date.now()) {
    if (!moduleEntry?.updatedAt) {
        return true;
    }

    return now - moduleEntry.updatedAt > MODULE_STALE_MS;
}

export function formatCellTooltip(moduleId, index, value) {
    if (!Number.isFinite(value)) {
        return `Module ${moduleId} Cell ${index}: ---`;
    }

    return `Module ${moduleId} Cell ${index}: ${value.toFixed(3)} V`;
}

export function formatTempTooltip(moduleId, value) {
    if (!Number.isFinite(value)) {
        return `Module ${moduleId} max temp: ---`;
    }

    return `Module ${moduleId} max temp: ${value.toFixed(1)} C`;
}

export function formatModuleTooltip(moduleId, value) {
    if (!Number.isFinite(value)) {
        return `Module ${moduleId} average voltage: ---`;
    }

    return `Module ${moduleId} average voltage: ${value.toFixed(3)} V`;
}

export function formatModuleSummaryTooltip(moduleId, averageCellVoltage, totalVoltage) {
    const averageText = Number.isFinite(averageCellVoltage) ? `${averageCellVoltage.toFixed(3)} V` : '---';
    const totalText = Number.isFinite(totalVoltage) ? `${totalVoltage.toFixed(3)} V` : '---';
    return `Module ${moduleId} average cell voltage: ${averageText}, total voltage: ${totalText}`;
}

export function formatSiliconId(value) {
    if (!value || value === '-') {
        return '---';
    }

    return value;
}

export function formatTableValue(value, digits = 3) {
    if (!Number.isFinite(value)) {
        return '---';
    }

    return value.toFixed(digits);
}
