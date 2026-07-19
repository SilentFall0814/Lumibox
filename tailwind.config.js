/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ============ 语义颜色 (Apple HIG / Pinguo design tokens) ============
        // 使用 CSS 变量(RGB 三元组)支持明暗主题动态切换 + alpha 透明度
        background: 'rgb(var(--color-background) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        card: 'rgb(var(--color-card) / <alpha-value>)',
        'card-foreground': 'rgb(var(--color-card-foreground) / <alpha-value>)',
        popover: 'rgb(var(--color-popover) / <alpha-value>)',
        'popover-foreground': 'rgb(var(--color-popover-foreground) / <alpha-value>)',

        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-hover': 'rgb(var(--color-primary-hover) / <alpha-value>)',
        'primary-bg': 'rgb(var(--color-primary-bg) / <alpha-value>)',
        'primary-foreground': 'rgb(var(--color-primary-foreground) / <alpha-value>)',

        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        'secondary-foreground': 'rgb(var(--color-secondary-foreground) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        'muted-fg': 'rgb(var(--color-muted-fg) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--color-muted-fg) / <alpha-value>)', // 兼容别名
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-foreground': 'rgb(var(--color-accent-foreground) / <alpha-value>)',

        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        'danger-foreground': 'rgb(var(--color-danger-foreground) / <alpha-value>)',
        destructive: 'rgb(var(--color-danger) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',

        border: 'rgb(var(--color-border) / <alpha-value>)',
        input: 'rgb(var(--color-input) / <alpha-value>)',
        ring: 'rgb(var(--color-ring) / <alpha-value>)',

        icon: 'rgb(var(--color-icon) / <alpha-value>)',
        'icon-muted': 'rgb(var(--color-icon-muted) / <alpha-value>)',

        // sidebar 语义色
        sidebar: 'rgb(var(--color-sidebar) / <alpha-value>)',
        'sidebar-foreground': 'rgb(var(--color-sidebar-foreground) / <alpha-value>)',
        'sidebar-primary': 'rgb(var(--color-sidebar-primary) / <alpha-value>)',
        'sidebar-accent': 'rgb(var(--color-sidebar-accent) / <alpha-value>)',

        // brand primitive scale (Apple System Blue)
        'brand-50': 'rgb(var(--brand-50) / <alpha-value>)',
        'brand-100': 'rgb(var(--brand-100) / <alpha-value>)',
        'brand-200': 'rgb(var(--brand-200) / <alpha-value>)',
        'brand-300': 'rgb(var(--brand-300) / <alpha-value>)',
        'brand-400': 'rgb(var(--brand-400) / <alpha-value>)',
        'brand-500': 'rgb(var(--brand-500) / <alpha-value>)',
        'brand-600': 'rgb(var(--brand-600) / <alpha-value>)',
        'brand-700': 'rgb(var(--brand-700) / <alpha-value>)',
        'brand-800': 'rgb(var(--brand-800) / <alpha-value>)',
        'brand-900': 'rgb(var(--brand-900) / <alpha-value>)',

        // background primitive scale (Apple System Grays)
        'bg-50': 'rgb(var(--background-50) / <alpha-value>)',
        'bg-100': 'rgb(var(--background-100) / <alpha-value>)',
        'bg-200': 'rgb(var(--background-200) / <alpha-value>)',
        'bg-300': 'rgb(var(--background-300) / <alpha-value>)',
        'bg-400': 'rgb(var(--background-400) / <alpha-value>)',
        'bg-500': 'rgb(var(--background-500) / <alpha-value>)',
        'bg-600': 'rgb(var(--background-600) / <alpha-value>)',
        'bg-700': 'rgb(var(--background-700) / <alpha-value>)',
        'bg-800': 'rgb(var(--background-800) / <alpha-value>)',
        'bg-900': 'rgb(var(--background-900) / <alpha-value>)',

        // viewer 专属语义色
        'viewer-bg': 'rgb(var(--viewer-background) / <alpha-value>)',
        'viewer-toolbar': 'rgb(var(--viewer-toolbar) / <alpha-value>)',
        'viewer-fg': 'rgb(var(--viewer-foreground) / <alpha-value>)',
        'viewer-muted': 'rgb(var(--viewer-muted) / <alpha-value>)',
        'viewer-border': 'rgb(var(--viewer-border) / <alpha-value>)',

        // 警告色 (Apple System Orange)
        warning: 'rgb(var(--state-warning) / <alpha-value>)'
      },
      fontFamily: {
        sans: ['DM Sans', 'PingFang SC', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      },
      borderRadius: {
        sm: '0.5rem',
        md: '0.75rem',
        lg: '1.2rem',     // 设计稿主圆角 19.2px
        xl: '1.5rem',
        '2xl': '2rem'
      },
      boxShadow: {
        '2xs': '0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 1px 3px -1px rgba(0, 0, 0, 0.05)',
        'md': '0 4px 8px -2px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'lg': '0 8px 24px -8px rgba(0, 0, 0, 0.08), 0 4px 8px -4px rgba(0, 0, 0, 0.05)',
        'xl': '0 16px 40px -10px rgba(0, 0, 0, 0.10), 0 8px 16px -8px rgba(0, 0, 0, 0.06)',
        '2xl': '0 24px 64px -12px rgba(0, 0, 0, 0.12)'
      },
      transitionTimingFunction: {
        // Apple spring damping 1.0 / response 0.3-0.4s
        spring: 'cubic-bezier(0.32, 0.72, 0, 1)',
        bouncy: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        gentle: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        'slide-in-bottom': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '60%': { opacity: '1', transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' }
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        'viewer-image-enter': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-in-up': 'fade-in-up 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        'slide-in-right': 'slide-in-right 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        'slide-in-bottom': 'slide-in-bottom 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
        'pop-in': 'pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'float': 'float 5s ease-in-out infinite',
        'shimmer': 'shimmer 1.6s linear infinite',
        'viewer-image-enter': 'viewer-image-enter 0.45s cubic-bezier(0.32, 0.72, 0, 1)'
      }
    }
  },
  plugins: []
};
