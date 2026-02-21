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

  pusher = new Pusher(config.public.pusherKey as string, {
    cluster: config.public.pusherCluster as string
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
    <!-- UUID Setup Modal -->
    <UuidSetupModal
      :show="showUuidSetup"
      :temp-uuid="tempUserUuid"
      @update:temp-uuid="tempUserUuid = $event"
      @save="saveUserUuid"
    />

    <div class="container mx-auto max-w-7xl">
      <UCard class="shadow-lg">
        <template #header>
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Chat Application</h1>
          </div>
        </template>

        <div class="px-6 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          <!-- Left Sidebar -->
          <div class="lg:col-span-1 space-y-4">
            <!-- Your UUID Card -->
            <UCard class="shadow-sm">
              <template #header>
                <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Account</h3>
                </div>
              </template>
              <div class="px-4 py-3">
                <UserUuidDisplay
                  :uuid="chatFromUuid"
                  @change="changeUserUuid"
                />
              </div>
            </UCard>

            <!-- Recipient UUID Card -->
            <UCard class="shadow-sm">
              <template #header>
                <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Chat</h3>
                </div>
              </template>
              <div class="px-4 py-3">
                <RecipientInput
                  :uuid="chatToUuid"
                  :user-name="chatToUserName"
                  :loading="loadingUserName || loading"
                  :user-found="userProfileLoaded"
                  @update:uuid="chatToUuid = $event"
                  @find="findUser"
                  @clear="clearConversation"
                />
              </div>
            </UCard>
          </div>

          <!-- Right Content -->
          <div class="lg:col-span-3 space-y-6">
            <!-- Chat Messages Section -->
            <ChatMessages
              :chats="chats"
              :current-user-uuid="chatFromUuid"
              :loading="loading"
              :editing-message-id="editingMessageId"
              :editing-message-text="editingMessageText"
              @edit="startEditMessage"
              @cancel-edit="cancelEdit"
              @save-edit="saveEditMessage"
              @delete="deleteMessage"
              @update:editing-text="editingMessageText = $event"
            />

            <!-- Send Message Section -->
            <SendMessageInput
              :message="newMessage"
              :sending="sending"
              @update:message="newMessage = $event"
              @send="sendMessage"
            />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
