<script setup>
import BalancingControls from '../status/BalancingControls.vue';
import StatusIndicators from '../status/StatusIndicators.vue';

defineProps({
    title: {
        type: String,
        required: true
    },
    logoSrc: {
        type: String,
        default: ''
    },
    statusItems: {
        type: Array,
        required: true
    },
    balancingSummary: {
        type: String,
        default: ''
    },
    balancingEnabled: {
        type: Boolean,
        default: false
    },
    balancingDisabled: {
        type: Boolean,
        default: true
    }
});

defineEmits(['toggle-balancing']);
</script>

<template>
    <header class="app-header panel">
        <div class="header-row">
            <div class="header-left">
                <img v-if="logoSrc" class="app-banner" :src="logoSrc" :alt="title">
            </div>
            <div class="header-center">
                <StatusIndicators :items="statusItems" />
            </div>
            <div class="header-right">
                <BalancingControls
                    :summary="balancingSummary"
                    :enabled="balancingEnabled"
                    :disabled="balancingDisabled"
                    @toggle="$emit('toggle-balancing')"
                />
            </div>
        </div>
    </header>
</template>
