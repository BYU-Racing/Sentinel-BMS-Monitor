<script setup>
import SidebarSection from '../layout/SidebarSection.vue';

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
    statusMessage: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['update:selectedPort', 'connect', 'disconnect']);

function onPortChange(event) {
    emit('update:selectedPort', event.target.value);
}
</script>

<template>
    <SidebarSection>
        <label for="portSelect">Serial Port</label>
        <select
            id="portSelect"
            :value="selectedPort"
            :disabled="isConnected || !ports.length"
            aria-label="Available serial ports"
            @change="onPortChange"
        >
            <option value="" disabled>
                {{ ports.length ? 'Select a serial port' : 'No serial ports found' }}
            </option>
            <option v-for="port in ports" :key="port.path" :value="port.path">
                {{ port.label ? `${port.label} (${port.path})` : port.path }}
            </option>
        </select>
        <div class="buttons">
            <button id="connectButton" type="button" :disabled="!canConnect" @click="emit('connect')">
                Connect
            </button>
            <button id="disconnectButton" type="button" :disabled="!isConnected" @click="emit('disconnect')">
                Disconnect
            </button>
        </div>
        <p class="status">{{ statusMessage }}</p>
    </SidebarSection>
</template>
