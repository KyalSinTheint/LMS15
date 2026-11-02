/** KBZ Life departments, used on the Register page and profile screens. */
export const DEPARTMENTS = [
  'Operations',
  'Admin',
  'Human Resources',
  'Learning & Development',
  'Finance',
  'Bancassurance',
  'Corporate Direct Sales',
  'IT',
  'Marketing',
  'Agency',
] as const;

/** The list, plus the person's current value if it is an older department name. */
export const departmentOptions = (current?: string | null): string[] =>
  current && !(DEPARTMENTS as readonly string[]).includes(current) ? [current, ...DEPARTMENTS] : [...DEPARTMENTS];
