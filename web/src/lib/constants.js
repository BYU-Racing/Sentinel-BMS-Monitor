export const MV_TO_V = 0.001;
export const BASE_VOLTAGE_RANGE = { min: 3.0, max: 4.2 };
export const BASE_TEMPERATURE_RANGE = { min: 15, max: 60 };
export const AXIS_PADDING = { voltage: 0.05, temperature: 2 };
export const MODULE_IDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
export const CELL_VOLTAGE_DISPLAY_RANGE = { min: 2.8, max: 4.15 };
export const MODULE_STALE_MS = 15000;
export const STATUS_COLORS = {
    GOOD: '#22c55e',
    WARNING: '#eab308',
    EXHAUSTED: '#f97316',
    ERROR: '#ef4444',
    READY: '#2563eb',
    BAD_DATA: '#a855f7',
    DISCONNECTED: '#cbd2d9'
};

export const VOLTAGE_SERIES = [
    { key: 'cell_min_v', label: 'Cell Min [V]', color: '#2563eb' },
    { key: 'cell_max_v', label: 'Cell Max [V]', color: '#f97316' },
    { key: 'cell_avg_v', label: 'Cell Avg [V]', color: '#10b981' }
];

export const TEMPERATURE_SERIES = [
    { key: 'temp_min_c', label: 'T1-T6 Min', color: '#ec4899' },
    { key: 'temp_max_c', label: 'T1-T6 Max', color: '#8b5cf6' },
    { key: 'temp_avg_c', label: 'T1-T6 Avg', color: '#f59e0b' },
    { key: 'temp7_avg_c', label: 'T7 Avg', color: '#06b6d4' }
];

export const ALL_SERIES = [...VOLTAGE_SERIES, ...TEMPERATURE_SERIES];
