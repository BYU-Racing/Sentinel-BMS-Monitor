<script setup>
import {
    ArrowUp,
    ArrowDown,
    Thermometer,
    Flame,
    Boxes,
    Unplug
} from 'lucide-vue-next';
import { computed } from 'vue';

const props = defineProps({
    type: {
        type: String,
        required: true
    },
    title: {
        type: String,
        default: ''
    },
    decorative: {
        type: Boolean,
        default: true
    }
});

const iconComponent = computed(() => {
    switch (props.type) {
    case 'overvoltage':
        return ArrowUp;
    case 'undervoltage':
        return ArrowDown;
    case 'tempDisconnected':
        return Thermometer;
    case 'overheating':
        return Flame;
    case 'notEnoughModules':
        return Boxes;
    default:
        return Unplug;
    }
});

const iconClass = computed(() => {
    switch (props.type) {
    case 'overvoltage':
        return 'fault-icon-overvoltage';
    case 'undervoltage':
        return 'fault-icon-undervoltage';
    case 'tempDisconnected':
        return 'fault-icon-temp-disconnected';
    case 'overheating':
        return 'fault-icon-overheating';
    case 'notEnoughModules':
        return 'fault-icon-not-enough-modules';
    default:
        return 'fault-icon-module-disconnected';
    }
});
</script>

<template>
    <component
        :is="iconComponent"
        class="fault-icon"
        :class="iconClass"
        :title="title"
        :aria-hidden="decorative"
        :role="decorative ? undefined : 'img'"
    />
</template>
