<script setup lang="ts">
interface Props {
  message: string
  sending: boolean
}

interface Emits {
  (e: 'update:message', value: string): void
  (e: 'send'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<template>
  <div class="flex gap-3 items-end pt-2">
    <UInput
      :model-value="message"
      @update:model-value="$emit('update:message', $event)"
      placeholder="Type your message..."
      size="lg"
      icon="i-lucide-message-circle"
      class="flex-1"
      @keyup.enter="$emit('send')"
    />
    <UButton
      @click="$emit('send')"
      :loading="sending"
      icon="i-lucide-send"
      size="lg"
      class="flex-shrink-0 whitespace-nowrap"
      :disabled="!message.trim()"
    >
      Send
    </UButton>
  </div>
</template>
