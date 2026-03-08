/**
 * Encryption Configuration
 * Manages master encryption key and algorithm constants
 * 
 * SECURITY: Never log or expose these values
 */

/**
 * Master encryption key from environment
 * Expected format: 64-character hex string (256-bit)
 */
export const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

/**
 * Encryption algorithm constants
 */
export const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16, // 128 bits (standard for GCM)
  authTagLength: 16, // 128 bits (authentication tag)
  saltRounds: 12, // bcrypt rounds (higher = slower but more secure)
} as const;

/**
 * Validate encryption key format
 * Returns true if key is valid 64-char hex string
 */
export function isValidEncryptionKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  if (key.length !== 64) return false;
  return /^[a-f0-9]{64}$/i.test(key);
}

/**
 * Assert encryption key is valid (throws if not)
 */
export function validateEncryptionKey(): void {
  if (!isValidEncryptionKey(ENCRYPTION_KEY)) {
    throw new Error(
      'ENCRYPTION_KEY is missing or invalid. Expected 64-char hex string.'
    );
  }
}

/**
 * Sensitive data field types that should be encrypted
 */
export enum SensitiveFieldType {
  PATIENT_NAME = 'patient_name',
  PATIENT_CONTACT = 'patient_contact',
  MEDICAL_RECORD_ID = 'medical_record_id',
  ADMISSION_DIAGNOSIS = 'admission_diagnosis',
  CLINICAL_NOTES = 'clinical_notes',
  USER_EMAIL = 'user_email',
  USER_FULL_NAME = 'user_full_name',
  DELAY_REASON_NOTES = 'delay_reason_notes',
  IP_ADDRESS = 'ip_address',
  ACTION_DETAILS = 'action_details',
}

/**
 * Risk level for each field type
 */
export const FIELD_RISK_LEVELS: Record<SensitiveFieldType, 'high' | 'medium' | 'low'> = {
  [SensitiveFieldType.PATIENT_NAME]: 'high',
  [SensitiveFieldType.PATIENT_CONTACT]: 'high',
  [SensitiveFieldType.MEDICAL_RECORD_ID]: 'high',
  [SensitiveFieldType.ADMISSION_DIAGNOSIS]: 'high',
  [SensitiveFieldType.CLINICAL_NOTES]: 'high',
  [SensitiveFieldType.USER_EMAIL]: 'medium',
  [SensitiveFieldType.USER_FULL_NAME]: 'medium',
  [SensitiveFieldType.DELAY_REASON_NOTES]: 'medium',
  [SensitiveFieldType.IP_ADDRESS]: 'low',
  [SensitiveFieldType.ACTION_DETAILS]: 'low',
};
