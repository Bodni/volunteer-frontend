<template>
  <img
    v-bind="$attrs"
    :src="currentSrc"
    @error="useFallback"
  />
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  src: {
    type: String,
    default: '',
  },
  fallback: {
    type: String,
    default: '/images/placeholder.jpg',
  },
})

const currentSrc = ref(props.src || props.fallback)

watch(
  () => props.src,
  (newSrc) => {
    currentSrc.value = newSrc || props.fallback
  }
)

function useFallback() {
  if (currentSrc.value !== props.fallback) {
    currentSrc.value = props.fallback
  }
}
</script>