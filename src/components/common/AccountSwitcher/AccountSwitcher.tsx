import styles from './AccountSwitcher.module.css';

interface Account {
  role: string;
  email: string;
}

interface AccountSwitcherProps {
  accounts: readonly Account[];
  accountIndex: number;
  onChange: (index: number) => void;
}

/**
 * Lets a tester act as any of the seeded backend accounts (Admin, Breeder,
 * Producer, ...) so role-gated actions — like approving a variety, which
 * only Admin can do — can actually be exercised and their 403s observed.
 */
export function AccountSwitcher({ accounts, accountIndex, onChange }: AccountSwitcherProps) {
  return (
    <label className={styles.wrap}>
      Acting as
      <select
        className={styles.select}
        value={accountIndex}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {accounts.map((account, index) => (
          <option key={account.email} value={index}>
            {account.role}
          </option>
        ))}
      </select>
    </label>
  );
}
