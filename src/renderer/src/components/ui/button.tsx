import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Apple HIG 风格胶囊形按钮
 * - rounded-full 胶囊形
 * - 主色填充 / 浅灰底 / 浅红底+红字 / 危险填充 四种变体
 * - 弹簧动效(Apple spring damping 1.0)
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'danger' | 'dangerSoft' | 'secondary';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'iconSm';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const variants = {
      // 主色填充 - 蓝底白字
      default: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm hover:shadow-md',
      // 浅灰底描边
      outline: 'bg-background/60 text-foreground border border-border hover:bg-muted backdrop-blur-md',
      // 幽灵(透明)
      ghost: 'text-foreground hover:bg-muted',
      // 浅灰底次级
      secondary: 'bg-muted text-foreground hover:bg-bg-300',
      // 危险填充 - 红底白字
      danger: 'bg-danger text-white hover:bg-red-600 shadow-sm hover:shadow-md',
      // 浅红底+红字(用于回收站、删除按钮等次要危险操作)
      dangerSoft: 'bg-red-50 text-danger hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40'
    };
    const sizes = {
      xs: 'h-7 px-3 text-xs gap-1',
      sm: 'h-8 px-3.5 text-xs gap-1.5',
      md: 'h-9 px-4 text-sm gap-1.5',
      lg: 'h-10 px-5 text-sm gap-2',
      icon: 'h-9 w-9',
      iconSm: 'h-8 w-8'
    };
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-full font-medium',
          'transition-all duration-300 ease-spring',
          'active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
