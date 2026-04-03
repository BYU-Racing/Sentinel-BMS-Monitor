import { MODULE_IDS } from './constants';
import { isModuleStale } from './formatters';

export const CELL_UNDERVOLTAGE_THRESHOLD_V = 2.8;
export const CELL_OVERVOLTAGE_THRESHOLD_V = 4.15;
export const TEMP_SENSOR_DISCONNECTED_THRESHOLD_C = 0;
export const TEMP_SENSOR_OVERHEAT_THRESHOLD_C = 60;

function createFault(type, text, moduleId = null, detailIndex = null) {
    return {
        type,
        text,
        moduleId,
        detailIndex
    };
}

export function getModuleFaults(moduleId, moduleEntry, now = Date.now()) {
    if (isModuleStale(moduleEntry, now)) {
        return [
            createFault('moduleDisconnected', `Module ${moduleId} not connected`, moduleId)
        ];
    }

    const faults = [];

    (moduleEntry?.cells?.values ?? []).forEach((value, index) => {
        if (!Number.isFinite(value)) {
            return;
        }

        if (value < CELL_UNDERVOLTAGE_THRESHOLD_V) {
            faults.push(
                createFault(
                    'undervoltage',
                    `Module ${moduleId} Cell ${index + 1} undervoltage (${value.toFixed(3)} V)`,
                    moduleId,
                    index + 1
                )
            );
            return;
        }

        if (value > CELL_OVERVOLTAGE_THRESHOLD_V) {
            faults.push(
                createFault(
                    'overvoltage',
                    `Module ${moduleId} Cell ${index + 1} overvoltage (${value.toFixed(3)} V)`,
                    moduleId,
                    index + 1
                )
            );
        }
    });

    (moduleEntry?.temp?.values ?? []).forEach(({ index, value }) => {
        if (!Number.isFinite(value)) {
            return;
        }

        if (value < TEMP_SENSOR_DISCONNECTED_THRESHOLD_C) {
            faults.push(
                createFault(
                    'tempDisconnected',
                    `Module ${moduleId} Thermistor ${index} disconnected (${value.toFixed(1)} C)`,
                    moduleId,
                    index
                )
            );
            return;
        }

        if (value > TEMP_SENSOR_OVERHEAT_THRESHOLD_C) {
            faults.push(
                createFault(
                    'overheating',
                    `Module ${moduleId} Thermistor ${index} overheating (${value.toFixed(1)} C)`,
                    moduleId,
                    index
                )
            );
        }
    });

    return faults;
}

export function buildFaultSummary(moduleState, now = Date.now()) {
    const moduleFaultsById = {};
    const sidebarFaults = [];
    let connectedModuleCount = 0;

    MODULE_IDS.forEach((moduleId) => {
        const moduleEntry = moduleState[moduleId] ?? {};
        const moduleFaults = getModuleFaults(moduleId, moduleEntry, now);
        moduleFaultsById[moduleId] = moduleFaults;

        const isConnected = !moduleFaults.some((fault) => fault.type === 'moduleDisconnected');
        if (isConnected) {
            connectedModuleCount += 1;
            sidebarFaults.push(...moduleFaults);
        }
    });

    if (connectedModuleCount < MODULE_IDS.length) {
        sidebarFaults.unshift(
            createFault(
                'notEnoughModules',
                `Only ${connectedModuleCount} of ${MODULE_IDS.length} modules connected`
            )
        );
    }

    return {
        connectedModuleCount,
        moduleFaultsById,
        sidebarFaults
    };
}

export function getFaultKinds(faults) {
    return [...new Set((faults ?? []).map((fault) => fault.type))];
}
