import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';
import styles from './Input.module.css';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  helperText?: string;
  errorText?: string;
  prefix?: string;
  leftIcon?: LucideIcon;
}

export function Input({
  label,
  helperText,
  errorText,
  prefix,
  leftIcon: LeftIcon,
  type = 'text',
  className = '',
  ...rest
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const inputClasses = [
    styles.input,
    prefix ? styles.hasPrefix : '',
    LeftIcon ? styles.withLeftIcon : '',
    isPassword ? styles.hasToggle : '',
    errorText ? styles.error : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.wrapper}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.inputWrap}>
        {LeftIcon && <LeftIcon size={16} className={styles.leftIcon} />}
        {prefix && <span className={styles.prefix}>{prefix}</span>}
        <input type={resolvedType} className={inputClasses} {...rest} />
        {isPassword && (
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {errorText && <span className={styles.errorText}>{errorText}</span>}
      {!errorText && helperText && <span className={styles.helperText}>{helperText}</span>}
    </div>
  );
}
