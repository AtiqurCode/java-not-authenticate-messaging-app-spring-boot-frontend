<script setup lang="ts">
interface Chat {
  id: number
  message: string
  chatFrom: {
    uuid: string
    name: string
  }
  chatTo: {
    uuid: string
  }
  createdAt: string
}

interface Props {
  chats: Chat[]
  currentUserUuid: string
  loading: boolean
  editingMessageId: number | null
  editingMessageText: string
}

interface Emits {
  (e: 'edit', chat: Chat): void
  (e: 'cancel-edit'): void
  (e: 'save-edit', messageId: number): void
  (e: 'delete', messageId: number): void
  (e: 'update:editingText', value: string): void
}

defineProps<Props>()
defineEmits<Emits>()

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}
</script>

<template>
  <div v-if="chats.length > 0" class="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
    <div class="bg-gray-50 dark:bg-gray-800/50 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
      <h3 class="font-semibold text-gray-900 dark:text-white">Messages</h3>
    </div>
    <div class="h-[450px] overflow-y-auto space-y-4 p-6 bg-white dark:bg-gray-900">
      <div
        v-for="chat in chats"
        :key="chat.id"
        :class="[
          'flex gap-3 group',
          chat.chatFrom.uuid === currentUserUuid ? 'justify-end' : 'justify-start'
        ]"
      >
        <div
          :class="[
            'max-w-[75%] rounded-xl p-4 shadow-sm relative',
            chat.chatFrom.uuid === currentUserUuid
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
          ]"
        >
          <!-- Action buttons - only show for own messages -->
          <div v-if="chat.chatFrom.uuid === currentUserUuid" class="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <!-- Edit button -->
            <button
              @click="$emit('edit', chat)"
              class="w-6 h-6 rounded-full flex items-center justify-center shadow-lg bg-blue-500 hover:bg-blue-600 text-white"
              title="Edit message"
            >
              <UIcon name="i-lucide-pencil" class="w-3 h-3" />
            </button>
            <!-- Delete button -->
            <button
              @click="$emit('delete', chat.id)"
              class="w-6 h-6 rounded-full flex items-center justify-center shadow-lg bg-red-500 hover:bg-red-600 text-white"
              title="Delete message"
            >
              <UIcon name="i-lucide-trash-2" class="w-3 h-3" />
            </button>
          </div>

          <div class="flex items-center gap-2 mb-2">
            <UIcon name="i-lucide-user" class="w-4 h-4 flex-shrink-0" />
            <p class="text-xs font-semibold">{{ chat.chatFrom.name }}</p>
          </div>

          <!-- Edit mode -->
          <div v-if="editingMessageId === chat.id" class="space-y-2">
            <UInput
              :model-value="editingMessageText"
              @update:model-value="$emit('update:editingText', $event)"
              size="sm"
              autofocus
              @keyup.enter="$emit('save-edit', chat.id)"
              @keyup.esc="$emit('cancel-edit')"
              :ui="{ base: 'text-gray-900 dark:text-white' }"
            />
            <div class="flex gap-2">
              <UButton
                @click="$emit('save-edit', chat.id)"
                size="xs"
                icon="i-lucide-check"
                color="primary"
              >
                Save
              </UButton>
              <UButton
                @click="$emit('cancel-edit')"
                size="xs"
                icon="i-lucide-x"
                variant="outline"
                :ui="{ base: chat.chatFrom.uuid === currentUserUuid ? 'text-white border-white hover:bg-white/20' : '' }"
              >
                Cancel
              </UButton>
            </div>
          </div>

          <!-- Normal view -->
          <div v-else>
            <UTooltip :text="formatTime(chat.createdAt)" :shortcuts="[]">
              <p class="text-sm mb-2 leading-relaxed cursor-help">{{ chat.message }}</p>
            </UTooltip>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="!loading" class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl py-12 text-center">
    <UIcon name="i-lucide-message-square" class="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
    <p class="text-gray-500 dark:text-gray-400 font-medium">No chats yet. Load chats to get started.</p>
  </div>
</template>
