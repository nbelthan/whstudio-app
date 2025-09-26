/**
 * Input component with various types and validation states
 * Follows World App design guidelines with consistent styling
 */

import React, { forwardRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { BaseComponentProps } from '@/types';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'ghost';
  fullWidth?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  autoComplete?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  className,
  type = 'text',
  placeholder,
  value,
  defaultValue,
  disabled = false,
  readOnly = false,
  required = false,
  error,
  label,
  hint,
  leftIcon,
  rightIcon,
  size = 'md',
  variant = 'default',
  fullWidth = true,
  maxLength,
  autoFocus = false,
  autoComplete,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;
  const hasError = !!error;

  const containerClasses = cn(
    'relative',
    fullWidth && 'w-full'
  );

  const baseInputClasses = 'w-full bg-transparent border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black placeholder:text-white/40 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    default: cn(
      'border-white/20 focus:border-[rgb(25,137,251)] focus:ring-[rgb(25,137,251)]/20',
      hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
      isFocused && !hasError && 'border-[rgb(25,137,251)]'
    ),
    filled: cn(
      'bg-white/5 border-transparent focus:border-[rgb(25,137,251)] focus:ring-[rgb(25,137,251)]/20',
      hasError && 'bg-red-500/10 border-red-500/20 focus:border-red-500 focus:ring-red-500/20',
      isFocused && !hasError && 'border-[rgb(25,137,251)]'
    ),
    ghost: cn(
      'border-transparent hover:bg-white/5 focus:bg-white/5 focus:border-[rgb(25,137,251)] focus:ring-[rgb(25,137,251)]/20',
      hasError && 'focus:border-red-500 focus:ring-red-500/20'
    )
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-4 text-base',
  };

  const inputClasses = cn(
    baseInputClasses,
    variantClasses[variant],
    sizeClasses[size],
    leftIcon && 'pl-10',
    (rightIcon || isPassword) && 'pr-10',
    className
  );

  const iconClasses = 'absolute top-1/2 -translate-y-1/2 w-4 h-4 text-white/40';

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <div className={containerClasses}>
      {label && (
        <label className="block text-sm font-medium text-white mb-2">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <div className={cn(iconClasses, 'left-3')}>
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          type={inputType}
          className={inputClasses}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          maxLength={maxLength}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={onKeyDown}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            className={cn(iconClasses, 'right-3 cursor-pointer hover:text-white/60')}
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}

        {rightIcon && !isPassword && (
          <div className={cn(iconClasses, 'right-3')}>
            {rightIcon}
          </div>
        )}
      </div>

      {(error || hint) && (
        <div className="mt-2 text-xs">
          {error ? (
            <span className="text-red-400">{error}</span>
          ) : hint ? (
            <span className="text-white/60">{hint}</span>
          ) : null}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;