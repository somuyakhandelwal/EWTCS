/**
 * Batch field encryption/decryption utilities (AES-256-GCM)
 * US-18: Encrypt multiple sensitive fields in a single call
 */

import { encryptField, decryptField } from './field-encryptor'
import type { EncryptedFieldValue } from '../types/encryption'

/**
 * Encrypt multiple fields in a batch.
 * @param fields - Object with plaintext values
 * @param keys - Optional list of specific keys to encrypt; defaults to all keys
 */
export function encryptFieldsBatch(
  fields: Record<string, string>,
  keys?: string[]
): Record<string, EncryptedFieldValue | string> {
  const result: Record<string, EncryptedFieldValue | string> = {}
  const fieldsToEncrypt = keys || Object.keys(fields)

  for (const key of fieldsToEncrypt) {
    if (key in fields) {
      try {
        result[key] = encryptField(fields[key])
      } catch {
        result[key] = fields[key]
      }
    }
  }
  return result
}

/**
 * Decrypt multiple fields in a batch.
 * @param fields - Object with encrypted values
 * @param keys - Optional list of specific keys to decrypt; defaults to all keys
 */
export function decryptFieldsBatch(
  fields: Record<string, EncryptedFieldValue | string>,
  keys?: string[]
): Record<string, string> {
  const result: Record<string, string> = {}
  const fieldsToDecrypt = keys || Object.keys(fields)

  for (const key of fieldsToDecrypt) {
    if (key in fields) {
      const value = fields[key]
      if (typeof value === 'object' && value !== null && 'data' in value) {
        try {
          result[key] = decryptField(value as EncryptedFieldValue)
        } catch {
          result[key] = ''
        }
      } else {
        result[key] = String(value)
      }
    }
  }
  return result
}

/**
 * Type-guard: check if a value appears to be an encrypted field.
 */
export function isEncryptedField(value: unknown): value is EncryptedFieldValue {
  if (typeof value !== 'object' || value === null) return false
  const field = value as Record<string, unknown>
  return (
    typeof field.data === 'string' &&
    typeof field.tag  === 'string' &&
    typeof field.iv   === 'string' &&
    typeof field.kv   === 'number'
  )
}
