/**
 * useEncryptedField Hook
 * React hook for handling encrypted field display and updates
 */

import { useState, useCallback, useEffect } from 'react';
import { decryptSensitiveField } from '@/features/data-encryption/actions/encrypt-actions';
import type { EncryptedFieldValue } from '@/features/data-encryption/types/encryption';

interface UseEncryptedFieldOptions {
  /** Auto-decrypt on mount */
  autoDecrypt?: boolean;
  /** Error callback */
  onError?: (error: Error) => void;
}

/**
 * Hook to manage encrypted field state and operations
 * Handles decryption, loading states, and error handling
 * 
 * @param initialEncrypted - Initial encrypted value from database
 * @param options - Configuration options
 * @returns { plaintext, isLoading, error, decrypt }
 */
export function useEncryptedField(
  initialEncrypted: EncryptedFieldValue | null | undefined,
  options: UseEncryptedFieldOptions = {}
) {
  const { autoDecrypt = true, onError } = options;

  const [plaintext, setPlaintext] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const decrypt = useCallback(async () => {
    if (!initialEncrypted) {
      setPlaintext('');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const decrypted = await decryptSensitiveField(initialEncrypted);
      setPlaintext(decrypted);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Decryption failed');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [initialEncrypted, onError]);

  // Auto-decrypt on mount if enabled
  useEffect(() => {
    if (autoDecrypt && initialEncrypted) {
      decrypt();
    }
  }, [autoDecrypt, initialEncrypted, decrypt]);

  return {
    plaintext,
    isLoading,
    error,
    decrypt,
  };
}

/**
 * Hook to display masked sensitive field
 * Shows only first and last characters
 */
export function useMaskedField(plaintext: string, maskChar: string = '•') {
  const masked = plaintext
    .split('')
    .map((char, i, arr) => {
      if (i === 0 || i === arr.length - 1) return char;
      return maskChar;
    })
    .join('');

  return masked;
}
