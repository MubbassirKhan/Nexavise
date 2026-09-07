import React from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen, onClose, title, subtitle, children, size = 'md', footer,
}) => {
  if (!isOpen) return null;

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/* Modal */}
      <div className={clsx(
        'relative w-full bg-navy-800 border border-white/10 rounded-2xl shadow-2xl animate-scale-in',
        'flex flex-col max-h-[90vh]',
        sizeClass,
      )}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/8 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="btn-icon ml-4 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div className="border-t border-white/8 p-6 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// ── SlideOver ─────────────────────────────────────────────────────────────────
interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

export const SlideOver: React.FC<SlideOverProps> = ({
  isOpen, onClose, title, subtitle, children, width = 'lg',
}) => {
  const widthClass = { md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-3xl' }[width];

  return (
    <div className={clsx('fixed inset-0 z-50', !isOpen && 'pointer-events-none')}>
      {/* Backdrop */}
      <div
        className={clsx(
          'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />
      {/* Panel */}
      <div className={clsx(
        'absolute right-0 top-0 bottom-0 w-full bg-navy-800 border-l border-white/10 shadow-2xl',
        'flex flex-col transition-transform duration-300 ease-out',
        isOpen ? 'translate-x-0' : 'translate-x-full',
        widthClass,
      )}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/8 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="btn-icon ml-4">
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
