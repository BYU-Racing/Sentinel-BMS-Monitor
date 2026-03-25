<script setup>
import { computed } from 'vue';
import AppHeader from './components/layout/AppHeader.vue';
import AppSidebar from './components/layout/AppSidebar.vue';
import ModuleDetailModal from './components/module/ModuleDetailModal.vue';
import ModuleOverviewView from './views/ModuleOverviewView.vue';
import PackStatsView from './views/PackStatsView.vue';
import { useSerialMonitor } from './composables/useSerialMonitor';

const {
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
} = useSerialMonitor();

const statusItems = computed(() => [
    { key: 'bms', label: 'BMS', status: statusState.bms },
    { key: 'board', label: 'Board', status: statusState.board },
    { key: 'voltage', label: 'Voltage', status: statusState.voltage },
    { key: 'temp', label: 'Temperature', status: statusState.temp }
]);
</script>

<template>
    <main class="app-shell">
        <AppHeader
            title="Sentinel Monitor"
            :status-items="statusItems"
            :balancing-summary="balancingSummary"
            :balancing-enabled="balancingState.enabled"
            :balancing-disabled="!isConnected"
            @toggle-balancing="toggleBalancing"
        />

        <section class="app-layout">
            <AppSidebar
                v-model:selected-port="selectedPort"
                :ports="ports"
                :is-connected="isConnected"
                :can-connect="canConnect"
                :has-data="hasData"
                :active-view="activeView"
                :status-message="statusMessage"
                @connect="connect"
                @disconnect="disconnect"
                @change-view="setActiveView"
                @reset="resetData"
                @export="exportCsv"
            />

            <section class="content-area">
                <PackStatsView
                    v-if="activeView === 'packStats'"
                    :chart-labels="chartLabels"
                    :chart-series="chartSeries"
                    :chart-bounds="chartBounds"
                />
                <ModuleOverviewView
                    v-else
                    :module-state="moduleState"
                    :module-names-by-silicon-id="moduleNamesBySiliconId"
                    :balancing-state="balancingState"
                    :now="now"
                    @open-module="openModuleModal"
                />
            </section>
        </section>

        <ModuleDetailModal
            :module-id="activeModuleModalId"
            :module-state="moduleState"
            :module-names-by-silicon-id="moduleNamesBySiliconId"
            @close="closeModuleModal"
        />
    </main>
</template>
