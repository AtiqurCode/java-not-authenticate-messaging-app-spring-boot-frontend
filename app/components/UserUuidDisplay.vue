<script setup lang="ts">
interface Props {
  uuid: string
}

interface Emits {
  (e: 'change'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<template>
  <div class="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-lg p-3">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <UIcon name="i-lucide-user" class="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <div class="min-w-0">
          <p class="text-xs font-semibold text-blue-700 dark:text-blue-300">Your ID</p>
          <p class="text-xs text-blue-600 dark:text-blue-400 font-mono truncate">
            {{ uuid || 'Not set' }}
          </p>
        </div>
      </div>
      <UButton
        v-if="uuid"
        @click="$emit('change')"
        variant="ghost"
        size="xs"
        icon="i-lucide-settings"
        class="text-cyan-600 dark:text-cyan-400 flex-shrink-0"
      />
    </div>
  </div>
</template>
