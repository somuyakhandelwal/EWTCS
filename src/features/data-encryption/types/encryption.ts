/**
 * Sensitive Data Types & Field Mapping
 * Defines encrypted fields across EWTCS database
 */

/**
 * Encryption metadata stored with encrypted data
 */
export interface EncryptionMetadata {
  /** Algorithm used for encryption */
  algorithm: string;
  /** Initialization vector (base64) */
  iv: string;
  /** Authentication tag for integrity check (base64) */
  authTag: string;
  /** When encrypted */
  encryptedAt: Date;
  /** Version of encryption key used */
  keyVersion: number;
}

/**
 * Encrypted field value structure
 * Stored as JSON in database
 */
export interface EncryptedFieldValue {
  /** Encrypted data (base64) */
  data: string;
  /** Authentication tag (base64) */
  tag: string;
  /** Initialization vector (base64) */
  iv: string;
  /** Key version */
  kv: number;
}

/**
 * Patient admission sensitive fields (HIGH RISK - HIPAA)
 */
export interface PatientAdmissionEncrypted {
  patientName: string; // Encrypted PII
  patientContact: string; // Encrypted PII (phone/email)
  medicalRecordId: string; // Encrypted PHI
  admissionDiagnosis: string; // Encrypted PHI
}

/**
 * User profile sensitive fields (MEDIUM RISK)
 */
export interface UserEncrypted {
  password: string; // bcrypt hash
  email: string; // Encrypted PII
  fullName: string; // Encrypted PII
}

/**
 * Bed stage log sensitive fields (MEDIUM RISK)
 */
export interface BedStageLogEncrypted {
  clinicalNotes: string; // Encrypted PHI
  delayReasonNotes: string; // Encrypted operational data
}

/**
 * Audit log sensitive fields (LOW-MEDIUM RISK)
 */
export interface AuditLogEncrypted {
  ipAddress: string; // Encrypted operational data
  actionDetails: string; // Encrypted operational data
}

/**
 * Field encryption status for operations
 */
export enum FieldEncryptionStatus {
  PLAINTEXT = 'plaintext', // Not yet encrypted
  ENCRYPTED = 'encrypted', // Encrypted successfully
  DECRYPTED = 'decrypted', // Decrypted for display
  PENDING = 'pending', // Waiting for encryption job
  FAILED = 'failed', // Encryption failed
}

/**
 * Encryption job tracking
 */
export interface EncryptionJob {
  jobId: string;
  tableName: string;
  columnName: string;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  startedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  errorMessages: string[];
}

/**
 * Database migration tracking
 */
export interface MigrationAudit {
  migrationId: string;
  tableName: string;
  action: 'add_encrypted_column' | 'copy_data' | 'validate' | 'drop_old_column';
  recordsAffected: number;
  executedAt: Date;
  executedBy: string; // User email
  status: 'success' | 'failed' | 'rolled_back';
  notes?: string;
}

/**
 * Sensitive field registry - comprehensive mapping
 * Used for bulk operations (re-encryption, key rotation)
 */
export const SENSITIVE_FIELDS_REGISTRY = {
  'patient_admissions': [
    { column: 'patient_name', type: 'pii', riskLevel: 'high' },
    { column: 'patient_contact', type: 'pii', riskLevel: 'high' },
    { column: 'medical_record_id', type: 'phi', riskLevel: 'high' },
    { column: 'admission_diagnosis', type: 'phi', riskLevel: 'high' },
  ],
  'users': [
    { column: 'email', type: 'pii', riskLevel: 'medium' },
    { column: 'full_name', type: 'pii', riskLevel: 'medium' },
    // password uses bcrypt (not AES-256)
  ],
  'bed_stage_logs': [
    { column: 'clinical_notes', type: 'phi', riskLevel: 'high' },
    { column: 'delay_reason_notes', type: 'operational', riskLevel: 'medium' },
  ],
  'audit_logs': [
    { column: 'ip_address', type: 'operational', riskLevel: 'low' },
    { column: 'action_details', type: 'operational', riskLevel: 'low' },
  ],
} as const;

/**
 * Type-safe field access
 */
export type SensitiveFieldRegistry = typeof SENSITIVE_FIELDS_REGISTRY;
export type TableName = keyof SensitiveFieldRegistry;
export type FieldInfo = SensitiveFieldRegistry[TableName][number];

/**
 * Get all sensitive columns for a table
 */
export function getSensitiveColumns(tableName: TableName): string[] {
  const fields = SENSITIVE_FIELDS_REGISTRY[tableName] || [];
  return fields.map(f => f.column);
}

/**
 * Get all high-risk fields across databases
 */
export function getHighRiskFields(): Array<{ table: string; column: string }> {
  const result: Array<{ table: string; column: string }> = [];
  for (const [table, fields] of Object.entries(SENSITIVE_FIELDS_REGISTRY)) {
    for (const field of fields) {
      if (field.riskLevel === 'high') {
        result.push({ table, column: field.column });
      }
    }
  }
  return result;
}
