# Data Encryption & Sensitive Data Protection - Design Document

**Issue:** US-18  
**Status:** Phase 1 - Design Complete  
**Date:** March 3, 2026  
**Version:** 1.0

## 📋 Executive Summary

EWTCS handles sensitive patient and clinical data. This document outlines the encryption architecture to protect PII, PHI, and operational data at rest and in transit.

**Key Decisions:**
- **Password Hashing:** bcrypt (industry standard, battle-tested)
- **Field Encryption:** AES-256-GCM (symmetric encryption for sensitive fields)
- **Key Management:** Environment variables + database credentials store
- **Scope:** Phase 1 covers design; Phases 2-7 handle infrastructure & implementation

---

## 🎯 Acceptance Criteria

✅ Design strategy for encrypting sensitive data  
✅ Key management approach documented  
✅ Sensitive fields mapped in EWTCS  
✅ Architecture decisions justified  
✅ Integration points identified  

---

## 🔐 Encryption Strategy

### Layer 1: Password Hashing (bcrypt)

**When:** Every password stored in database  
**Algorithm:** bcrypt with salt rounds = 12  
**Use Case:** User authentication, secure password verification  

```typescript
// Library: bcryptjs
import bcrypt from 'bcryptjs';

// Hash on password create/update
const hashedPassword = await bcrypt.hash(plainPassword, 12);

// Verify on login
const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```

**Why bcrypt?**
- Adaptive: rounds = 12 prevents brute force
- Salted by default: no rainbow tables possible
- Industry standard: proven, audited, trusted
- Built-in in Node.js ecosystem

---

### Layer 2: Field Encryption (AES-256-GCM)

**When:** Sensitive PII/PHI at rest  
**Algorithm:** AES-256 in Galois/Counter Mode (authenticated encryption)  
**Use Case:** Patient names, contact info, clinical notes, diagnoses  

```typescript
// Library: crypto (Node.js native) + custom wrapper
import crypto from 'crypto';

interface EncryptionResult {
  encryptedData: string;  // base64
  iv: string;            // initialization vector
  authTag: string;       // authentication tag
  algorithm: string;     // 'aes-256-gcm'
}

// Encrypt sensitive field
const encrypted = encryptField(sensitiveData, masterKey);

// Decrypt when needed
const decrypted = decryptField(encrypted, masterKey);
```

**Why AES-256-GCM?**
- FIPS-approved: meets compliance requirements
- Authenticated: detects tampering (authTag)
- Fast: hardware acceleration available
- Industry standard: widely supported

---

### Layer 3: Transport Security (TLS)

**When:** Data in transit (network)  
**Current Status:** ✅ Already implemented  
- HTTPS enforced on all routes
- TLS 1.3 configured in nginx
- Secure cookies with httpOnly + SameSite

---

## 🔑 Key Management

### Master Key Strategy

**Location:** Environment variable `ENCRYPTION_KEY`  
**Format:** 64 character hex string (256-bit key)  
**Rotation:** Manual (documented in runbook)  
**Storage:**
- **Development:** `.env.local`
- **Production:** AWS Secrets Manager / GitHub Secrets
- **Staging:** Vault service

### Key Generation

```bash
# Generate secure 256-bit key (hex encoded)
node -e "console.log(crypto.randomBytes(32).toString('hex'))"

# Output: a1b2c3d4e5f6... (64 chars)
```

**Environment Setup:**

```bash
# .env.example (NO REAL KEY)
ENCRYPTION_KEY=your_64_char_hex_key_here

# .env.local (GITIGNORED - REAL KEY)
ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### Key Rotation Process

**When:** After encryption algorithm upgrades, security incidents, annually  
**Steps:**
1. Generate new key
2. Deploy with both old + new key
3. Re-encrypt all data with new key
4. Verify completeness
5. Deactivate old key

---

## 📊 Sensitive Data Mapping

### Patient Data (HIGH RISK)

| Field | Table | Type | Encryption | Rationale |
|-------|-------|------|-----------|-----------|
| `patient_name` | `patient_admissions` | PII | AES-256 | HIPAA requirement |
| `patient_contact` | `patient_admissions` | PII | AES-256 | Phone/email |
| `medical_record_id` | `patient_admissions` | PHI | AES-256 | Internal ID |
| `admission_diagnosis` | `patient_admissions` | PHI | AES-256 | Clinical data |
| `clinical_notes` | `bed_stage_logs` | PHI | AES-256 | Sensitive info |

### User Data (MEDIUM RISK)

| Field | Table | Type | Encryption | Rationale |
|-------|-------|------|-----------|-----------|
| `password` | `users` | Secret | bcrypt | Authentication |
| `email` | `users` | PII | AES-256 | User privacy |
| `full_name` | `users` | PII | AES-256 | Personnel data |

### Operational Data (LOW-MEDIUM RISK)

| Field | Table | Type | Encryption | Rationale |
|-------|-------|------|-----------|-----------|
| `delay_reason_notes` | `bed_stage_logs` | Sensitive | AES-256 | Audit trail |
| `ip_address` | `audit_logs` | Sensitive | AES-256 | User tracking |
| `action_details` | `audit_logs` | Sensitive | AES-256 | Compliance |

---

## 🏗️ Architecture Design

### Component Flow

```
┌─────────────────────────────────────────────────────────────┐
│  User Input (Login, Form Submission)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │  Zod Schema Validation    │
         │  (Type checking)          │
         └────────┬──────────────────┘
                  │
        ┌─────────▼──────────────────────────┐
        │  Server Action (@/actions/...)     │
        │  - Authorization checks            │
        │  - Input sanitization              │
        └─────────┬──────────────────────────┘
                  │
      ┌───────────▼────────────────────────────┐
      │  Encryption Layer                      │
      │  - bcrypt (passwords)                  │
      │  - AES-256 (PII/PHI fields)            │
      └─────────┬────────────────────────────┘
                │
      ┌─────────▼────────────────────────────┐
      │  Database Storage                    │
      │  - Encrypted columns                 │
      │  - JSONB for encryption metadata     │
      └──────────────────────────────────────┘

On Read:
Database → Decrypt → Application → User
```

### File Structure

```
src/features/data-encryption/
├── types/
│   └── encryption.ts              # EncryptionResult, FieldType
├── schemas/
│   └── encryption-schemas.ts      # Zod validation
├── lib/
│   ├── password-hasher.ts         # bcrypt wrapper
│   ├── field-encryptor.ts         # AES-256 wrapper
│   └── encryption-utils.ts        # Helper functions
├── actions/
│   └── encrypt-actions.ts         # Server actions
├── hooks/
│   └── use-encryption-status.ts   # UI hooks
└── components/
    └── EncryptionStatus.tsx       # Status display
```

---

## 🔄 Integration Points

### 1. User Authentication (Existing)

**Current:**
```typescript
// auth/actions/login.ts
const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```

**Change:** Minimal - already uses bcrypt ✅

### 2. User Registration (Phase 5)

**Path:** `src/features/auth/actions/register.ts`

**Add:**
```typescript
import { hashPassword } from '@/features/data-encryption/lib/password-hasher';

const user = await db.user.create({
  email: input.email,
  password: await hashPassword(input.password),  // AES-256 + bcrypt
});
```

### 3. Patient Data (Phase 5)

**Path:** `src/features/bed-dashboard/actions/patient-actions.ts`

**Add:**
```typescript
import { encryptField } from '@/features/data-encryption/lib/field-encryptor';

const patient = await db.patientAdmission.create({
  patient_name: await encryptField(input.name),
  patient_contact: await encryptField(input.contact),
  medical_record_id: await encryptField(input.mrid),
});
```

### 4. Audit Logging (Phase 5)

**Path:** `src/shared/lib/audit-logger.ts`

**Add:**
```typescript
import { encryptField } from '@/features/data-encryption/lib/field-encryptor';

// Mask sensitive fields before logging
const sanitizedDetails = {
  ...details,
  ip_address: await encryptField(details.ip_address),
};
```

---

## 📐 Data Flow Diagrams

### Encryption Flow

```
User Input
    ↓
Validation (Zod)
    ↓
[Choose Path]
    ├→ Password? → bcrypt → Stored
    └→ PII/PHI? → AES-256 + IV + AuthTag → Stored
```

### Decryption Flow

```
Retrieve from DB
    ↓
Check AuthTag (not tampered?)
    ↓
Decrypt with Master Key + IV
    ↓
Return plaintext to app
    ↓
Display to authorized user
```

---

## ✅ Checklist for Phase 1

- [x] Encryption strategy defined (bcrypt + AES-256)
- [x] Key management documented
- [x] Sensitive fields mapped
- [x] Architecture diagrams created
- [x] Integration points identified
- [x] Feature directory created
- [x] Design rationale explained

**Next:** Phase 2 - Infrastructure Setup (pgcrypto, env variables)

---

## 🔗 Related Documents

- [US-18: Data Encryption & Sensitive Data Protection](../issues/102)
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Feature-first hybrid structure
- [SECURITY.md](../SECURITY.md) - Security guidelines
- [docs/data-model.md](./data-model.md) - Database schema

---

**Author:** Development Team  
**Last Updated:** March 3, 2026  
**Status:** ✅ Design Phase Complete - Ready for Infrastructure Setup
