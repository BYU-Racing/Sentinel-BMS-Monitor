<script setup>
import DataActionsPanel from '../sidebar/DataActionsPanel.vue';
import SerialConnectionPanel from '../sidebar/SerialConnectionPanel.vue';
import ViewSelectorPanel from '../sidebar/ViewSelectorPanel.vue';

defineProps({
    selectedPort: {
        type: String,
        default: ''
    },
    ports: {
        type: Array,
        required: true
    },
    isConnected: {
        type: Boolean,
        default: false
    },
    canConnect: {
        type: Boolean,
        default: false
    },
    hasData: {
        type: Boolean,
        default: false
    },
    activeView: {
        type: String,
        required: true
    },
    statusMessage: {
        type: String,
        default: ''
    }
});

defineEmits(['update:selectedPort', 'connect', 'disconnect', 'change-view', 'reset', 'export']);
</script>

<template>
    <aside class="sidebar">
        <SerialConnectionPanel
            :selected-port="selectedPort"
            :ports="ports"
            :is-connected="isConnected"
            :can-connect="canConnect"
            :status-message="statusMessage"
            @update:selected-port="$emit('update:selectedPort', $event)"
            @connect="$emit('connect')"
            @disconnect="$emit('disconnect')"
        />

        <ViewSelectorPanel
            :active-view="activeView"
            @change-view="$emit('change-view', $event)"
        />

        <DataActionsPanel
            :has-data="hasData"
            @reset="$emit('reset')"
            @export="$emit('export')"
        />
    </aside>
</template>
