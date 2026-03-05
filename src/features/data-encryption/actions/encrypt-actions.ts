/**
 * Encryption Server Actions - Data Encryption
 * Handles encryption of patient, user, and field-level data
 */

'use server';

import { validateEncryptionKey } from '@/features/data-encryption/lib/encryption-config';
import {
  encryptField,
  decryptField,
  isEncryptedField,
} from '@/features/data-encryption/lib/field-encryptor';
import { hashPassword } from '@/features/data-encryption/lib/password-hasher';

/**
 * Validate encryption is properly configured
 * Call during application startup
 */
export async function validateEncryption(): Promise<{
  isValid: boolean;
  message: string;
}> {
  try {
    validateEncryptionKey();
    return {
      isValid: true,
      message: 'Encryption configured correctly',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      isValid: false,
      message: `Encryption validation failed: ${message}`,
    };
  }
}

/**
 * Encrypt patient data on admission
 * @param patientData - Patient info to encrypt
 * @returns Encrypted field values
 */
export async function encryptPatientData(
  patientData: Partial<{
    name: string;
    contact: string;
    medicalRecordId: string;
    diagnosis: string;
  }>
): Promise<Record<string, object>> {
  try {
    const encrypted: Record<string, object> = {};

    if (patientData.name) {
      encrypted.patient_name_encrypted = encryptField(patientData.name);
    }
    if (patientData.contact) {
      encrypted.patient_contact_encrypted = encryptField(patientData.contact);
    }
    if (patientData.medicalRecordId) {
      encrypted.medical_record_id_encrypted = encryptField(
        patientData.medicalRecordId
      );
    }
    if (patientData.diagnosis) {
      encrypted.admission_diagnosis_encrypted = encryptField(
        patientData.diagnosis
      );
    }

    return encrypted;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Patient data encryption failed: ${message}`);
  }
}

/**
 * Encrypt user data on registration
 * @param userData - User info to encrypt
 * @returns Encrypted field values
 */
export async function encryptUserData(
  userData: Partial<{
    email: string;
    fullName: string;
    password: string;
  }>
): Promise<Record<string, object | string>> {
  try {
    const encrypted: Record<string, object | string> = {};

    if (userData.email) {
      encrypted.email_encrypted = encryptField(userData.email);
    }
    if (userData.fullName) {
      encrypted.full_name_encrypted = encryptField(userData.fullName);
    }
    if (userData.password) {
      encrypted.password_hash = await hashPassword(userData.password);
    }

    return encrypted;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`User data encryption failed: ${message}`);
  }
}

/**
 * Decrypt sensitive field for authorized user
 * @param encryptedValue - Encrypted field value
 * @returns Decrypted plaintext (or error)
 * @throws Error if decryption fails (tampering detected)
 */
export async function decryptSensitiveField(
  encryptedValue: unknown
): Promise<string> {
  try {
    // Validate it looks like encrypted field
    if (!isEncryptedField(encryptedValue)) {
      throw new Error('Invalid encrypted field format');
    }

    // Decrypt
    const plaintext = decryptField(encryptedValue);
    return plaintext;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Decryption failed: ${message}`);
  }
}
