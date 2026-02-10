<script setup lang="ts">
import Pusher from 'pusher-js'

const config = useRuntimeConfig()
const toast = useToast()

const chatFromUuid = ref('')
const chatToUuid = ref('')
const chatToUserName = ref('')
const newMessage = ref('')
const chats = ref<any[]>([])
const loading = ref(false)
const sending = ref(false)
const loadingUserName = ref(false)
const showUuidSetup = ref(false)
const tempUserUuid = ref('')
const userProfileLoaded = ref(false)
const editingMessageId = ref<number | null>(null)
const editingMessageText = ref('')
let pusher: Pusher | null = null
let userChannel: any = null

// Request browser notification permission
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    return
  }

  if (Notification.permission === 'granted') {
    return
  }

  if (Notification.permission !== 'denied') {
    await Notification.requestPermission()
  }
}

// Show browser notification
const showNotification = (title: string, options?: NotificationOptions) => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/icon.png',
      ...options
    })
  }
}

// Initialize Pusher
const initPusher = (userUuid: string) => {
  if (pusher) return

  pusher = new Pusher('e74dc87a03e4dbf5d60b', {
    cluster: 'ap1'
  })

  // Subscribe to user's public per-uuid channel (no auth)
  const channelName = `chat-${userUuid}`
  userChannel = pusher.subscribe(channelName)

  // Listen for message deletions and updates
  userChannel.bind('new-message', (data: any) => {
    // Handle delete-message action
    if (data.action === 'delete-message' || data.action === 'delete') {
      const messageId = data.messageId || data.id
      const messageIndex = chats.value.findIndex(c => c.id === messageId)

      if (messageIndex !== -1) {
        const deletedMessage = chats.value[messageIndex]
        chats.value.splice(messageIndex, 1)
        showToast('💬 Message deleted', {
          color: 'warning',
          timeout: 2000
        })
      }
      return
    }

    // Handle edit-message action
    if (data.action === 'edit-message' || data.action === 'update') {
      const messageId = data.messageId || data.id
      const messageIndex = chats.value.findIndex(c => c.id === messageId)

      if (messageIndex !== -1) {
        chats.value[messageIndex].message = data.message
        showToast('✏️ Message updated', {
          color: 'info',
          timeout: 2000
        })
      }
      return
    }

    // This message is sent to our channel, so we are the recipient (data.chatToUuid === chatFromUuid.value)
    // Only process if this message is intended for us
    if (data.chatToUuid !== userUuid) {
      return
    }

    // Check if message is part of current active conversation
    const isRelevant = chatToUuid.value &&
      (data.chatFromUuid === chatToUuid.value || data.chatToUuid === chatToUuid.value)

    if (isRelevant) {
      const isDuplicate = chats.value.some(c => c.id === data.id)

      if (!isDuplicate) {
        chats.value.push({
          id: data.id,
          message: data.message,
          chatFrom: {
            uuid: data.chatFromUuid,
            name: data.senderName || 'User'
          },
          chatTo: {
            uuid: data.chatToUuid
          },
          createdAt: data.createdAt || new Date().toISOString()
        })

        // Show notification for incoming message
        showNotification(`New message from ${data.senderName || 'User'}`, {
          body: data.message.substring(0, 100),
          tag: 'chat-notification',
          requireInteraction: false
        })

        // Show toast
        showToast(`📨 Message from ${data.senderName || 'User'}`, {
          description: data.message.substring(0, 50) + (data.message.length > 50 ? '...' : ''),
          color: 'info',
          timeout: 3000
        })

        // Auto-scroll to bottom
        setTimeout(() => {
          const chatContainer = document.querySelector('.overflow-y-auto')
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight
          }
        }, 100)
      }
    }
  })

  userChannel.bind('pusher:subscription_error', (status: number) => {
    showToast('Connection error', {
      description: 'Failed to connect to real-time service',
      color: 'error',
      timeout: 3000
    })
  })

  userChannel.bind('pusher:subscription_succeeded', () => {
  })

  // Test event listener
  userChannel.bind('test-event', (data: any) => {
    showToast('✅ Pusher connection test successful!', { color: 'success', timeout: 3000 })
  })

  // Separate listeners for delete and edit messages
  userChannel.bind('delete-message', (data: any) => {
    const messageId = data.messageId || data.id
    const messageIndex = chats.value.findIndex(c => c.id === messageId)

    if (messageIndex !== -1) {
      chats.value.splice(messageIndex, 1)
      showToast('💬 Message deleted', { color: 'warning', timeout: 2000 })
    }
  })

  userChannel.bind('edit-message', (data: any) => {
    const messageId = data.messageId || data.id
    const messageIndex = chats.value.findIndex(c => c.id === messageId)

    if (messageIndex !== -1) {
      chats.value[messageIndex].message = data.message
      showToast('✏️ Message updated', { color: 'info', timeout: 2000 })
    }
  })
}

// Load user UUID and chat recipient UUID from localStorage on mount
onMounted(() => {
  requestNotificationPermission()

  const savedUuid = localStorage.getItem('userChatUuid')
  if (savedUuid) {
    chatFromUuid.value = savedUuid
    showUuidSetup.value = false
    initPusher(savedUuid)
  } else {
    showUuidSetup.value = true
  }

  // Load the chat recipient UUID
  const savedChatToUuid = localStorage.getItem('chatToUuid')
  if (savedChatToUuid) {
    chatToUuid.value = savedChatToUuid
    // Auto-fetch user profile for saved UUID
    fetchUserName(savedChatToUuid)
  }
})

// Cleanup Pusher on unmount
onBeforeUnmount(() => {
  if (pusher) {
    pusher.disconnect()
  }
})

const saveUserUuid = () => {
  if (!tempUserUuid.value.trim()) {
    showToast('Please enter a valid UUID', { color: 'error' })
    return
  }

  chatFromUuid.value = tempUserUuid.value
  localStorage.setItem('userChatUuid', tempUserUuid.value)
  showUuidSetup.value = false
  initPusher(tempUserUuid.value)
  showToast('✓ Your UUID has been saved', { color: 'success' })
}

const changeUserUuid = () => {
  tempUserUuid.value = chatFromUuid.value
  showUuidSetup.value = true
}

// Only save to localStorage when user explicitly modifies chatToUuid
watch(chatToUuid, (newValue) => {
  if (newValue.trim()) {
    localStorage.setItem('chatToUuid', newValue)
  } else {
    localStorage.removeItem('chatToUuid')
    chatToUserName.value = ''
    userProfileLoaded.value = false
  }
})

const findUser = async () => {
  if (!chatToUuid.value.trim()) {
    showToast('Please enter a UUID', { color: 'error' })
    return
  }

  await fetchUserName(chatToUuid.value)
}

const clearConversation = () => {
  chats.value = []
  chatToUuid.value = ''
  chatToUserName.value = ''
  userProfileLoaded.value = false
  localStorage.removeItem('chatToUuid')
  showToast('Conversation cleared', { color: 'info' })
}

// Fetch user name by UUID
const fetchUserName = async (uuid: string) => {
  if (!uuid.trim()) return

  loadingUserName.value = true
  userProfileLoaded.value = false
  try {
    const response = await $fetch(`${config.public.apiBase}/users/uuid/${uuid}`, {
      method: 'GET'
    })
    chatToUserName.value = (response as any).name || 'Unknown User'
    userProfileLoaded.value = true

    // Automatically load chats after user is found
    await fetchChats()
  } catch (error: any) {
    chatToUserName.value = 'User not found'
    userProfileLoaded.value = false
  } finally {
    loadingUserName.value = false
  }
}

const fetchChats = async () => {
  if (!chatFromUuid.value || !chatToUuid.value) {
    showToast('Please enter both User UUIDs', { color: 'error' })
    return
  }

  loading.value = true
  try {
    const response = await $fetch(`${config.public.apiBase}/chats/between`, {
      method: 'POST',
      body: {
        chatFromUuid: chatFromUuid.value,
        chatToUuid: chatToUuid.value
      }
    })

    const loadedMessages = response as any[]

    // Replace messages (start fresh for new conversation)
    chats.value = loadedMessages.sort((a, b) => a.id - b.id)

    showToast('✓ Chats loaded', {
      description: `${loadedMessages.length} messages loaded`,
      color: 'success'
    })

    // Auto-scroll to bottom after load - use nextTick to ensure DOM is updated
    nextTick(() => {
      setTimeout(() => {
        const chatContainer = document.querySelector('.overflow-y-auto')
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight
        }
      }, 50)
    })
  } catch (error: any) {
    showToast('Failed to load chats', { description: error.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const sendMessage = async () => {
  if (!newMessage.value.trim()) {
    showToast('Please enter a message', { color: 'error' })
    return
  }

  if (!chatFromUuid.value || !chatToUuid.value) {
    showToast('Please enter both User UUIDs', { color: 'error' })
    return
  }

  sending.value = true
  try {
    const messageData = {
      chatFromUuid: chatFromUuid.value,
      chatToUuid: chatToUuid.value,
      message: newMessage.value
    }

    // Send message - backend automatically triggers Pusher
    const response = await $fetch(`${config.public.apiBase}/chats`, {
      method: 'POST',
      body: messageData
    })

    // Clear input and show success
    const sentMessage = newMessage.value
    newMessage.value = ''

    showToast('✓ Message sent', { color: 'success', timeout: 1500 })

    // Add message to chat immediately (in case Pusher is slow)
    chats.value.push({
      id: (response as any).id,
      message: sentMessage,
      chatFrom: {
        uuid: chatFromUuid.value,
        name: 'You'
      },
      chatTo: {
        uuid: chatToUuid.value
      },
      createdAt: (response as any).createdAt || new Date().toISOString()
    })

    // Auto-scroll to bottom
    setTimeout(() => {
      const chatContainer = document.querySelector('.overflow-y-auto')
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight
      }
    }, 100)
  } catch (error: any) {
    showToast('Failed to send message', { description: error.message, color: 'error' })
  } finally {
    sending.value = false
  }
}

// Toast helper function with consistent timeout
// Toast helper function with automatic dismissal
const showToast = (title: string, options?: { description?: string; color?: 'error' | 'success' | 'info' | 'warning'; timeout?: number }) => {
  const timeout = options?.timeout ?? 2000

  const toastObj = toast.add({
    title,
    description: options?.description,
    color: options?.color
  })

  // Auto-dismiss after timeout
  setTimeout(() => {
    if (toastObj?.id) {
      toast.remove(toastObj.id)
    }
  }, timeout)
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}

const deleteMessage = async (messageId: number) => {
  try {
    const response = await $fetch(`${config.public.apiBase}/chats/${messageId}`, {
      method: 'DELETE'
    })

    // Remove from local array
    const index = chats.value.findIndex(c => c.id === messageId)
    if (index !== -1) {
      chats.value.splice(index, 1)
    }

    showToast('✓ Message deleted', { color: 'success', timeout: 1500 })
  } catch (error: any) {
    showToast('Failed to delete message', { description: error.message, color: 'error' })
  }
}

const startEditMessage = (chat: any) => {
  editingMessageId.value = chat.id
  editingMessageText.value = chat.message
}

const cancelEdit = () => {
  editingMessageId.value = null
  editingMessageText.value = ''
}

const saveEditMessage = async (messageId: number) => {
  if (!editingMessageText.value.trim()) {
    showToast('Message cannot be empty', { color: 'error' })
    return
  }

  try {
    const response = await $fetch(`${config.public.apiBase}/chats/${messageId}`, {
      method: 'PUT',
      body: {
        message: editingMessageText.value
      }
    })

    // Update local array
    const index = chats.value.findIndex(c => c.id === messageId)
    if (index !== -1) {
      chats.value[index].message = editingMessageText.value
    }

    cancelEdit()
    showToast('✓ Message updated', { color: 'success', timeout: 1500 })
  } catch (error: any) {
    showToast('Failed to update message', { description: error.message, color: 'error' })
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
    <!-- UUID Setup Modal with Fixed Overlay -->
    <ClientOnly>
      <Teleport to="body">
        <div v-if="showUuidSetup" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div class="bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-8 w-full max-w-md mx-4">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Set Your User UUID</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Enter your unique identifier (UUID). This will be saved locally and used as your sender ID for all messages.
            </p>

            <div class="space-y-4">
              <UFormGroup label="Your UUID" required>
                <UInput
                  v-model="tempUserUuid"
                  placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
                  icon="i-lucide-user"
                  autofocus
                  size="lg"
                  @keyup.enter="saveUserUuid"
                />
              </UFormGroup>
            </div>

            <div class="flex gap-3 justify-end mt-8">
              <UButton
                @click="saveUserUuid"
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

    <div class="container mx-auto max-w-4xl">
      <UCard class="shadow-lg">
        <template #header>
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Chat Application</h1>
            <UButton
              v-if="chatFromUuid"
              @click="changeUserUuid"
              variant="ghost"
              size="sm"
              icon="i-lucide-settings"
              class="text-cyan-600 dark:text-cyan-400"
            >
              Change UUID
            </UButton>
          </div>
        </template>

        <div class="px-6 py-6 space-y-6">
          <!-- Your UUID Display -->
          <div class="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
            <div class="flex items-start gap-4">
              <UIcon name="i-lucide-info" class="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">Your User ID</p>
                <p class="text-sm text-blue-700 dark:text-blue-300 font-mono break-all bg-blue-100 dark:bg-blue-900/50 rounded px-3 py-2">
                  {{ chatFromUuid || 'Not set' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Recipient UUID Input Section -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="block text-sm font-semibold text-gray-900 dark:text-white">
                Chat With User <span class="text-red-500">*</span>
              </label>
              <UButton
                v-if="chatToUuid"
                @click="clearConversation"
                variant="ghost"
                size="xs"
                icon="i-lucide-x"
                color="error"
              >
                Clear
              </UButton>
            </div>
            <div class="flex gap-3 items-end">
              <div class="flex-1">
                <UInput
                  v-model="chatToUuid"
                  placeholder="Enter recipient's UUID"
                  icon="i-lucide-user"
                  size="lg"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  This is the UUID of the user you want to chat with
                </p>
                <!-- Display loaded user profile with UUID and Name -->
                <div v-if="chatToUserName && chatToUserName !== 'User not found'" class="mt-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div class="space-y-2">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-semibold text-gray-600 dark:text-gray-300">UUID:</span>
                      <span class="text-sm text-gray-700 dark:text-gray-400 font-mono break-all">{{ chatToUuid }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-semibold text-green-900 dark:text-green-200">👤 Name:</span>
                      <span class="text-sm font-bold text-green-700 dark:text-green-300">{{ chatToUserName }}</span>
                    </div>
                  </div>
                </div>
                <!-- Show error if user not found -->
                <div v-else-if="chatToUserName === 'User not found'" class="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p class="text-sm font-semibold text-red-900 dark:text-red-200">
                    ❌ User not found. Please check the UUID
                  </p>
                </div>
              </div>
              <UButton
                v-if="!userProfileLoaded"
                @click="findUser"
                :loading="loadingUserName || loading"
                icon="i-lucide-search"
                size="lg"
                class="flex-shrink-0 whitespace-nowrap"
              >
                Find User
              </UButton>
            </div>
          </div>

          <!-- Chat Messages Section -->
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
                  chat.chatFrom.uuid === chatFromUuid ? 'justify-end' : 'justify-start'
                ]"
              >
                <div
                  :class="[
                    'max-w-[75%] rounded-xl p-4 shadow-sm relative',
                    chat.chatFrom.uuid === chatFromUuid
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  ]"
                >
                  <!-- Action buttons - only show for own messages -->
                  <div v-if="chat.chatFrom.uuid === chatFromUuid" class="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <!-- Edit button -->
                    <button
                      @click="startEditMessage(chat)"
                      class="w-6 h-6 rounded-full flex items-center justify-center shadow-lg bg-blue-500 hover:bg-blue-600 text-white"
                      title="Edit message"
                    >
                      <UIcon name="i-lucide-pencil" class="w-3 h-3" />
                    </button>
                    <!-- Delete button -->
                    <button
                      @click="deleteMessage(chat.id)"
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
                      v-model="editingMessageText"
                      size="sm"
                      autofocus
                      @keyup.enter="saveEditMessage(chat.id)"
                      @keyup.esc="cancelEdit"
                      :ui="{ base: 'text-gray-900 dark:text-white' }"
                    />
                    <div class="flex gap-2">
                      <UButton
                        @click="saveEditMessage(chat.id)"
                        size="xs"
                        icon="i-lucide-check"
                        color="primary"
                      >
                        Save
                      </UButton>
                      <UButton
                        @click="cancelEdit"
                        size="xs"
                        icon="i-lucide-x"
                        variant="outline"
                        :ui="{ base: chat.chatFrom.uuid === chatFromUuid ? 'text-white border-white hover:bg-white/20' : '' }"
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

          <!-- Send Message Section -->
          <div class="flex gap-3 items-end pt-2">
            <UInput
              v-model="newMessage"
              placeholder="Type your message..."
              size="lg"
              icon="i-lucide-message-circle"
              class="flex-1"
              @keyup.enter="sendMessage"
            />
            <UButton
              @click="sendMessage"
              :loading="sending"
              icon="i-lucide-send"
              size="lg"
              class="flex-shrink-0 whitespace-nowrap"
              :disabled="!newMessage.trim()"
            >
              Send
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
