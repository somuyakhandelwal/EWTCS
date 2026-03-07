/**
 * Encryption & Data Validation Schemas
 * Zod schemas for validating encrypted data structures
 */

import { z } from 'zod';

/**
 * Schema for encrypted field value
 * Validates the structure of { data, tag, iv, kv }
 */
export const encryptedFieldValueSchema = z.object({
  data: z.string().min(1, 'Encrypted data missing'),
  tag: z.string().min(16, 'Auth tag invalid'),
  iv: z.string().min(16, 'IV invalid'),
  kv: z.number().int().min(1, 'Key version must be >= 1'),
});

export type EncryptedFieldValue = z.infer<typeof encryptedFieldValueSchema>;

/**
 * Patient data input validation
 */
export const patientEncryptionInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  contact: z.string().min(1).max(255).optional(),
  medicalRecordId: z.string().min(1).max(255).optional(),
  diagnosis: z.string().min(1).max(1000).optional(),
});

export type PatientEncryptionInput = z.infer<
  typeof patientEncryptionInputSchema
>;

/**
 * User data input validation
 */
export const userEncryptionInputSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(1).max(255).optional(),
  password: z.string().min(8).max(128).optional(),
});

export type UserEncryptionInput = z.infer<typeof userEncryptionInputSchema>;

/**
 * Bulk operation input
 */
export const bulkEncryptInputSchema = z.object({
  table: z.enum([
    'patient_admissions',
    'users',
    'bed_stage_logs',
    'audit_logs',
  ]),
  limit: z.number().int().min(1).max(1000).default(100),
});

export type BulkEncryptInput = z.infer<typeof bulkEncryptInputSchema>;

/**
 * Encryption status query
 */
export const encryptionStatusQuerySchema = z.object({
  table: z.string().min(1),
});

export type EncryptionStatusQuery = z.infer<
  typeof encryptionStatusQuerySchema
>;

/**
 * Field decryption request
 */
export const decryptFieldInputSchema = z.object({
  encrypted: encryptedFieldValueSchema,
  fieldType: z.string().optional(),
});

export type DecryptFieldInput = z.infer<typeof decryptFieldInputSchema>;
