/**
 * Encryption Utility for Chat Messages
 *
 * NOTE: Currently, encryption/decryption is handled on the backend.
 * Messages are encrypted before storage in the database and decrypted before being sent to the frontend.
 * This utility is provided for future client-side encryption if needed.
 *
 * The backend uses AES-256-CBC encryption with the secret key configured in application.properties.
 */

/**
 * Convert string to ArrayBuffer
 */
function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length)
  const bufView = new Uint8Array(buf)
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i)
  }
  return buf
}

/**
 * Convert ArrayBuffer to string
 */
function ab2str(buf: ArrayBuffer): string {
  return String.fromCharCode.apply(null, Array.from(new Uint8Array(buf)))
}

/**
 * Convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert Base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Derive a key from a password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a message using AES-GCM
 * @param message - Plain text message to encrypt
 * @param secretKey - Secret key for encryption
 * @returns Base64 encoded encrypted message (IV + encrypted data)
 */
export async function encryptMessage(message: string, secretKey: string): Promise<string> {
  try {
    const enc = new TextEncoder()
    const encodedMessage = enc.encode(message)

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12))

    // Generate random salt for key derivation
    const salt = crypto.getRandomValues(new Uint8Array(16))

    // Derive key from secret
    const key = await deriveKey(secretKey, salt)

    // Encrypt
    const encryptedContent = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encodedMessage
    )

    // Combine salt + IV + encrypted data
    const encryptedArray = new Uint8Array(encryptedContent)
    const combined = new Uint8Array(salt.length + iv.length + encryptedArray.length)
    combined.set(salt, 0)
    combined.set(iv, salt.length)
    combined.set(encryptedArray, salt.length + iv.length)

    // Return as Base64
    return arrayBufferToBase64(combined.buffer)
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt message')
  }
}

/**
 * Decrypt a message using AES-GCM
 * @param encryptedMessage - Base64 encoded encrypted message (salt + IV + encrypted data)
 * @param secretKey - Secret key for decryption
 * @returns Decrypted plain text message
 */
export async function decryptMessage(encryptedMessage: string, secretKey: string): Promise<string> {
  try {
    // Decode from Base64
    const combined = new Uint8Array(base64ToArrayBuffer(encryptedMessage))

    // Extract salt, IV and encrypted data
    const salt = combined.slice(0, 16)
    const iv = combined.slice(16, 28)
    const encryptedData = combined.slice(28)

    // Derive key from secret
    const key = await deriveKey(secretKey, salt)

    // Decrypt
    const decryptedContent = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedData
    )

    // Convert to string
    const dec = new TextDecoder()
    return dec.decode(decryptedContent)
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt message')
  }
}

/**
 * Check if encryption is available in the current environment
 */
export function isEncryptionAvailable(): boolean {
  return typeof crypto !== 'undefined' &&
         typeof crypto.subtle !== 'undefined' &&
         typeof crypto.getRandomValues !== 'undefined'
}
