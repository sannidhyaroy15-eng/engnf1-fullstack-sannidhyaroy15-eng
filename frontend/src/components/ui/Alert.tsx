import React from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface AlertProps {
  type?: 'error' | 'success' | 'warning' | 'info';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  className,
}) => {
  const styles = {
    error: 'bg-rose-50 border-rose-200 text-rose-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const icons = {
    error: <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
    warning: <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
    info: <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />,
  };

  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-3.5 rounded-lg border text-sm',
        styles[type],
        className
      )}
    >
      {icons[type]}
      <div className="flex-1">
        {title && <p className="font-semibold text-xs tracking-wide uppercase mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
};
