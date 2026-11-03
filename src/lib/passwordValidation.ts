/**
 * Password rules for the KBZLIFE LMS (strong password):
 * 1. At least 6 characters
 * 2. At least one uppercase letter (A–Z)
 * 3. At least one lowercase letter (a–z)
 * 4. At least one number (0–9)
 * 5. At least one symbol (e.g. ! @ # $ %)
 */

export const PASSWORD_MIN_LENGTH = 6;

export interface PasswordRequirementItem {
  id: 'length' | 'uppercase' | 'lowercase' | 'number' | 'symbol';
  label: string;
  met: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  requirements: PasswordRequirementItem[];
  firstErrorMessage: string | null;
}

export function validatePassword(password: string): PasswordValidationResult {
  const requirements: PasswordRequirementItem[] = [
    { id: 'length', label: `At least ${PASSWORD_MIN_LENGTH} characters.`, met: password.length >= PASSWORD_MIN_LENGTH },
    { id: 'uppercase', label: 'At least one uppercase letter (A–Z).', met: /[A-Z]/.test(password) },
    { id: 'lowercase', label: 'At least one lowercase letter (a–z).', met: /[a-z]/.test(password) },
    { id: 'number', label: 'At least one number (0–9).', met: /[0-9]/.test(password) },
    { id: 'symbol', label: 'At least one symbol (e.g. ! @ # $ %).', met: /[^A-Za-z0-9\s]/.test(password) },
  ];
  const messages: Record<PasswordRequirementItem['id'], string> = {
    length: `Your password must contain at least ${PASSWORD_MIN_LENGTH} characters.`,
    uppercase: 'Please include at least one uppercase letter (A–Z).',
    lowercase: 'Please include at least one lowercase letter (a–z).',
    number: 'Please include at least one number (0–9).',
    symbol: 'Please include at least one symbol (e.g. ! @ # $ %).',
  };
  const firstMissing = requirements.find((r) => !r.met);
  return {
    isValid: !firstMissing,
    requirements,
    firstErrorMessage: firstMissing ? messages[firstMissing.id] : null,
  };
}
