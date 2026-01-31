export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { socket_id, channel_name } = body

  if (!socket_id || !channel_name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'socket_id and channel_name are required'
    })
  }

  // Call Spring Boot backend directly
  try {
    const response = await $fetch('http://localhost:8081/api/v1/pusher/auth', {
      method: 'POST',
      body: {
        socket_id,
        channel_name
      }
    })

    return response
  } catch (error: any) {
    console.error('Pusher auth error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to authenticate Pusher channel'
    })
  }
})
