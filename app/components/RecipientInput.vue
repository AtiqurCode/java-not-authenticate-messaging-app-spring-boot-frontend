<script setup lang="ts">
interface Props {
  uuid: string
  userName: string
  loading: boolean
  userFound: boolean
}

interface Emits {
  (e: 'update:uuid', value: string): void
  (e: 'find'): void
  (e: 'clear'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<template>
  <div class="space-y-2">
    <div class="flex gap-2 items-end">
      <div class="flex-1">
        <label class="block text-xs font-semibold text-gray-900 dark:text-white mb-1">
          Chat With <span class="text-red-500">*</span>
        </label>
        <div class="flex gap-2 items-end">
          <UInput
            :model-value="uuid"
            @update:model-value="$emit('update:uuid', $event)"
            placeholder="Enter recipient's UUID"
            icon="i-lucide-user"
            size="sm"
          />
          <UButton
            v-if="!userFound"
            @click="$emit('find')"
            :loading="loading"
            icon="i-lucide-search"
            size="sm"
            class="flex-shrink-0"
          >
            Find
          </UButton>
          <UButton
            v-else-if="uuid"
            @click="$emit('clear')"
            variant="ghost"
            size="sm"
            icon="i-lucide-x"
            color="error"
          />
        </div>
      </div>
    </div>

    <!-- Display loaded user profile -->
    <div v-if="userName && userName !== 'User not found'" class="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
      <div class="space-y-1">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-green-900 dark:text-green-200">👤 {{ userName }}</span>
          <!-- <span class="text-xs text-green-700 dark:text-green-300 font-mono truncate">{{ uuid }}</span> -->
        </div>
      </div>
    </div>

    <!-- Show error if user not found -->
    <div v-else-if="userName === 'User not found'" class="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <p class="text-xs font-semibold text-red-900 dark:text-red-200">
        ❌ User not found
      </p>
    </div>
  </div>
</template>
