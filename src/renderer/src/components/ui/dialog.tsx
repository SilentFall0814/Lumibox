import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { Button } from './button';

/**
 * Apple HIG 风格对话框
 * - 1.2rem 圆角
 * - 弹簧动效 (scale-in + fade-in)
 * - 毛玻璃背景
 */
interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 - 黑色半透明 + 淡入 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/* 对话框主体 - 1.2rem 圆角 + 毛玻璃 + 弹簧入场 */}
      <div className={cn(
        'relative z-10 w-full max-w-md p-6 animate-scale-in',
        'rounded-lg border border-border/60 glass glass-edge shadow-2xl',
        className
      )}>
        {title && (
          <h2 className="mb-4 text-lg font-semibold text-foreground">{title}</h2>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, description, confirmText = '确定', cancelText = '取消',
  variant = 'default', onConfirm, onCancel
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} title={title}>
      <p className="mb-6 text-sm leading-relaxed text-muted-fg">{description}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>{cancelText}</Button>
        <Button variant={variant === 'danger' ? 'danger' : 'default'} size="sm" onClick={onConfirm}>
          {confirmText}
        </Button>
      </div>
    </Dialog>
  );
}
