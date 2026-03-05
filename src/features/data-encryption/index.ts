/**
 * Data Encryption Feature Public API
 * 
 * Feature-first exports for data encryption functionality
 * Import from '@/features/data-encryption' only what you need
 */

// Types
export type {
  EncryptionMetadata,
  EncryptedFieldValue,
  PatientAdmissionEncrypted,
  UserEncrypted,
  BedStageLogEncrypted,
  AuditLogEncrypted,
  EncryptionJob,
  MigrationAudit,
} from './types/encryption';

export {
  FieldEncryptionStatus,
  SENSITIVE_FIELDS_REGISTRY,
  getSensitiveColumns,
  getHighRiskFields,
} from './types/encryption';

// Configuration
export {
  ENCRYPTION_KEY,
  ENCRYPTION_CONFIG,
  SensitiveFieldType,
  FIELD_RISK_LEVELS,
  isValidEncryptionKey,
  validateEncryptionKey,
} from './lib/encryption-config';

// Key Management
export {
  generateEncryptionKey,
  generateKeyId,
  validateKeyFormat,
  deriveSubKey,
  KEY_ROTATION_CHECKLIST,
  KEY_SECURITY_BEST_PRACTICES,
} from './lib/key-management';

// Password Hashing
export {
  hashPassword,
  verifyPassword,
  isValidBcryptHash,
  getLastHashDuration,
  hashPasswordWithTiming,
} from './lib/password-hasher';

// Field Encryption/Decryption
export {
  encryptField,
  decryptField,
  encryptFieldsBatch,
  decryptFieldsBatch,
  isEncryptedField,
} from './lib/field-encryptor';

// Server Actions
export {
  validateEncryption,
  encryptPatientData,
  encryptUserData,
  decryptSensitiveField,
} from './actions/encrypt-actions';

export {
  bulkEncryptTable,
  getEncryptionStatus,
  rotateEncryptionKey,
} from './actions/encrypt-maintenance';

// Validation Schemas
export {
  encryptedFieldValueSchema,
  patientEncryptionInputSchema,
  userEncryptionInputSchema,
  bulkEncryptInputSchema,
  encryptionStatusQuerySchema,
  decryptFieldInputSchema,
} from './schemas/encrypt-schemas';

export type {
  EncryptedFieldValue as EncryptedFieldValueType,
  PatientEncryptionInput,
  UserEncryptionInput,
  BulkEncryptInput,
  EncryptionStatusQuery,
  DecryptFieldInput,
} from './schemas/encrypt-schemas';
