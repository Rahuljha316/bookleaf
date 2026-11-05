import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-slate-900 text-slate-50 shadow hover:bg-slate-900/80',
        secondary:
          'border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80',
        destructive:
          'border-transparent bg-red-500 text-slate-50 shadow hover:bg-red-500/80',
        outline: 'text-slate-950 border border-slate-200',
        // Semantic status variants
        open: 'border-transparent bg-blue-100 text-blue-800 font-medium',
        inProgress: 'border-transparent bg-amber-100 text-amber-900 font-medium',
        resolved: 'border-transparent bg-emerald-100 text-emerald-800 font-medium',
        closed: 'border-transparent bg-slate-100 text-slate-600 font-medium',
        // Priority variants
        critical: 'border-transparent bg-red-100 text-red-800 font-medium',
        high: 'border-transparent bg-orange-100 text-orange-800 font-medium',
        medium: 'border-transparent bg-yellow-100 text-yellow-800 font-medium',
        low: 'border-transparent bg-slate-100 text-slate-700 font-medium',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

