/**
 * EncryptedFieldDisplay Component
 * Shows encrypted field with option to reveal
 * 
 * Features:
 * • Masked by default (••••••)
 * • Click to reveal (with optional confirmation)
 * • Copy to clipboard support
 * • Loading state during decryption
 * • Error handling
 */

'use client';

import React, { useState } from 'react';
import { useEncryptedField, useMaskedField } from '../hooks/use-encrypted-field';
import type { EncryptedFieldValue } from '@/features/data-encryption/types/encryption';

interface EncryptedFieldDisplayProps {
  /** Encrypted field value from database */
  encrypted: EncryptedFieldValue | null | undefined;
  /** Label for the field */
  label?: string;
  /** Field type for accessibility */
  fieldType?: string;
  /** Whether field should be revealed on click */
  revealOnClick?: boolean;
  /** Copy to clipboard button */
  showCopyButton?: boolean;
  /** Custom error message */
  errorMessage?: string;
}

/**
 * Component to display encrypted field with reveal functionality
 */
export function EncryptedFieldDisplay({
  encrypted,
  label,
  fieldType,
  revealOnClick = true,
  showCopyButton = false,
  errorMessage = 'Failed to decrypt field',
}: EncryptedFieldDisplayProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const { plaintext, isLoading, error } = useEncryptedField(encrypted, {
    autoDecrypt: isRevealed,
  });

  const masked = useMaskedField(plaintext);
  const displayText = isRevealed ? plaintext : masked;

  const handleReveal = () => {
    if (!isRevealed && !plaintext) {
      // Will trigger useEncryptedField to decrypt
    }
    setIsRevealed(!isRevealed);
  };

  const handleCopy = async () => {
    if (plaintext) {
      try {
        await navigator.clipboard.writeText(plaintext);
      } catch {
        // Clipboard access may be denied — silently ignore non-critical copy failure
      }
    }
  };

  if (error) {
    return (
      <div className="text-destructive text-sm" role="alert">
        {errorMessage}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm font-medium">{label}:</span>}

      <div className="flex items-center gap-1">
        <span
          className="font-mono text-sm"
          title={fieldType ? `${fieldType} (encrypted)` : 'Encrypted'}
        >
          {isLoading ? '•••••••' : displayText}
        </span>

        {revealOnClick && (
          <button
            onClick={handleReveal}
            disabled={isLoading}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
            title={isRevealed ? 'Hide' : 'Reveal'}
            aria-label={isRevealed ? 'Hide field' : 'Reveal field'}
          >
            {isRevealed ? '👁️‍🗨️' : '👁️'}
          </button>
        )}

        {showCopyButton && isRevealed && (
          <button
            onClick={handleCopy}
            disabled={!plaintext}
            className="p-1 text-muted-foreground hover:text-foreground"
            title="Copy to clipboard"
            aria-label="Copy to clipboard"
          >
            📋
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton component while loading encrypted field
 */
export function EncryptedFieldSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
    </div>
  );
}
