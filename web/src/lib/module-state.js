import { MODULE_IDS, MV_TO_V } from './constants';
import { formatSiliconId, summarizeValues } from './formatters';

export function createEmptyModuleState() {
    return MODULE_IDS.reduce((accumulator, moduleId) => {
        accumulator[moduleId] = {};
        return accumulator;
    }, {});
}

export function updateModuleEntry(moduleState, parsedLine) {
    const currentEntry = moduleState[parsedLine.moduleId] ?? {};
    const moduleEntry = {
        ...currentEntry,
        updatedAt: Date.now()
    };

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

        moduleEntry.temp = {
            min: parsedLine.min,
            max: parsedLine.max,
            avg: summarizeValues(validAverageTemps)?.avg ?? null,
            t1To6,
            t7: temps.get(7),
            values: Array.from(temps.entries())
                .sort((left, right) => left[0] - right[0])
                .map(([index, value]) => ({ index, value }))
        };
    }

    moduleState[parsedLine.moduleId] = moduleEntry;
}

export function applyModuleSiliconIds(moduleState, entries) {
    entries.forEach(({ moduleId, siliconId }) => {
        moduleState[moduleId] = {
            ...(moduleState[moduleId] ?? {}),
            siliconId
        };
    });
}

export function getModuleName(moduleEntry, moduleNamesBySiliconId) {
    const siliconId = formatSiliconId(moduleEntry?.siliconId);
    if (siliconId === '---') {
        return '';
    }

    const name = moduleNamesBySiliconId[siliconId];
    return typeof name === 'string' ? name.trim() : '';
}

export function getModuleCardLabel(moduleEntry, moduleNamesBySiliconId) {
    return getModuleName(moduleEntry, moduleNamesBySiliconId) || formatSiliconId(moduleEntry?.siliconId);
}

export function getModuleModalTitle(moduleId, moduleEntry, moduleNamesBySiliconId) {
    return `M${moduleId} ${getModuleName(moduleEntry, moduleNamesBySiliconId) || formatSiliconId(moduleEntry?.siliconId)} Details`;
}

export function buildSummarySnapshot(moduleState) {
    const allCellValues = [];
    const allTempValues = [];
    const allT7Values = [];
    const validAverageCellValues = [];
    const validAverageTempValues = [];
    const validAverageT7Values = [];

    Object.values(moduleState).forEach((moduleEntry) => {
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

    const cellSummary = summarizeValues(allCellValues.filter((value) => Number.isFinite(value)));
    const tempSummary = summarizeValues(allTempValues.filter((value) => Number.isFinite(value)));
    const t7Summary = summarizeValues(allT7Values.filter((value) => Number.isFinite(value)));
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

export function buildPackSummary(moduleState) {
    const connectedCellValues = [];

    Object.values(moduleState).forEach((moduleEntry) => {
        if (!moduleEntry?.cells?.values?.length) {
            return;
        }

        connectedCellValues.push(
            ...moduleEntry.cells.values.filter((value) => Number.isFinite(value) && value <= 5.5)
        );
    });

    const summary = summarizeValues(connectedCellValues);
    if (!summary || !connectedCellValues.length) {
        return {
            averagePerCell: null,
            totalPackVoltage: null
        };
    }

    return {
        averagePerCell: summary.avg,
        totalPackVoltage: summary.avg * connectedCellValues.length
    };
}
