import { CheckCircle2, Circle } from 'lucide-react';

import { cn } from '@/lib/cn';
import { PASSWORD_REQUIREMENTS } from '@/lib/validators/auth';

type PasswordRequirementsChecklistProps = {
  password: string;
};

/**
 * Ticks each requirement live as the password is typed, rather than only
 * surfacing a single pass/fail error on blur — see useFieldErrors.ts for
 * that separate, touched-based error-message flow this complements.
 * Requirements are read from PASSWORD_REQUIREMENTS (lib/validators/auth.ts)
 * so this can never list a rule signUpSchema doesn't actually enforce.
 */
export function PasswordRequirementsChecklist({ password }: PasswordRequirementsChecklistProps) {
  return (
    <ul aria-label="Password requirements" className="flex flex-wrap gap-x-5 gap-y-2">
      {PASSWORD_REQUIREMENTS.map((requirement) => {
        const met = requirement.test(password);

        return (
          <li
            key={requirement.label}
            className={cn(
              'flex items-center gap-1.5',
              met ? 'text-[--color-success]' : 'text-[--color-text-muted]',
            )}
          >
            {met ? (
              <CheckCircle2 aria-hidden="true" size={14} />
            ) : (
              <Circle aria-hidden="true" size={14} />
            )}
            <span className="sr-only">{met ? 'Requirement met: ' : 'Requirement not met: '}</span>
            {requirement.label}
          </li>
        );
      })}
    </ul>
  );
}
