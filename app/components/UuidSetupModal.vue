<script setup lang="ts">
interface Props {
  show: boolean
  tempUuid: string
}

interface Emits {
  (e: 'update:tempUuid', value: string): void
  (e: 'save'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-8 w-full max-w-md mx-4">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Set Your User UUID</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Enter your unique identifier (UUID). This will be saved locally and used as your sender ID for all messages.
          </p>

          <div class="space-y-4">
            <UFormGroup label="Your UUID" required>
              <UInput
                :model-value="tempUuid"
                @update:model-value="$emit('update:tempUuid', $event)"
                placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
                icon="i-lucide-user"
                autofocus
                size="lg"
                @keyup.enter="$emit('save')"
              />
            </UFormGroup>
          </div>

          <div class="flex gap-3 justify-end mt-8">
            <UButton
              @click="$emit('save')"
              color="primary"
              icon="i-lucide-check"
              size="lg"
              class="w-full"
            >
              Save UUID
            </UButton>
          </div>
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>
