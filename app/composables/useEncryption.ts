/**
 * Composable for handling encrypted chat messages
 *
 * NOTE: Currently, the backend handles all encryption/decryption.
 * This composable is provided for future client-side encryption if needed.
 */

import { encryptMessage, decryptMessage, isEncryptionAvailable } from '~/utils/encryption'

export const useEncryption = () => {
  // In production, this should come from environment variables
  // For now, this matches the backend's default key
  const secretKey = ref('MySecretKey12345678901234567890SecureKey!@#')

  /**
   * Encrypt a message before sending to backend
   * @param message Plain text message
   * @returns Encrypted message
   */
  const encrypt = async (message: string): Promise<string> => {
    if (!isEncryptionAvailable()) {
      console.warn('Encryption is not available in this environment')
      return message
    }

    try {
      return await encryptMessage(message, secretKey.value)
    } catch (error) {
      console.error('Failed to encrypt message:', error)
      throw error
    }
  }

  /**
   * Decrypt a message received from backend
   * @param encryptedMessage Encrypted message
   * @returns Decrypted plain text message
   */
  const decrypt = async (encryptedMessage: string): Promise<string> => {
    if (!isEncryptionAvailable()) {
      console.warn('Decryption is not available in this environment')
      return encryptedMessage
    }

    try {
      return await decryptMessage(encryptedMessage, secretKey.value)
    } catch (error) {
      console.error('Failed to decrypt message:', error)
      throw error
    }
  }

  /**
   * Check if encryption is supported
   */
  const isSupported = computed(() => isEncryptionAvailable())

  return {
    encrypt,
    decrypt,
    isSupported,
    secretKey
  }
}
