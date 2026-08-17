import React from 'react';

export function PollCardSkeleton() {
  return (
    <div className="app-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 rounded skeleton-shimmer" />
        <div className="h-5 w-20 rounded-full skeleton-shimmer" />
      </div>
      <div className="space-y-2">
        <div className="h-6 w-3/4 rounded skeleton-shimmer" />
        <div className="h-4 w-1/2 rounded skeleton-shimmer" />
      </div>
      <div className="h-10 w-full rounded-lg skeleton-shimmer" />
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="h-4 w-24 rounded skeleton-shimmer" />
        <div className="h-4 w-32 rounded skeleton-shimmer" />
      </div>
    </div>
  );
}

export function DashboardMetricSkeleton() {
  return (
    <div className="app-card p-5 space-y-2">
      <div className="h-3 w-20 rounded skeleton-shimmer" />
      <div className="h-8 w-16 rounded skeleton-shimmer" />
      <div className="h-3 w-28 rounded skeleton-shimmer" />
    </div>
  );
}

export function BallotFormSkeleton() {
  return (
    <div className="app-card p-8 space-y-6 max-w-xl mx-auto">
      <div className="space-y-3">
        <div className="h-4 w-32 rounded skeleton-shimmer" />
        <div className="h-8 w-3/4 rounded skeleton-shimmer" />
        <div className="h-4 w-full rounded skeleton-shimmer" />
      </div>
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <div className="h-12 w-full rounded-lg skeleton-shimmer" />
        <div className="h-12 w-full rounded-lg skeleton-shimmer" />
        <div className="h-12 w-full rounded-lg skeleton-shimmer" />
      </div>
      <div className="h-12 w-full rounded-lg skeleton-shimmer" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-100">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="h-4 flex-1 rounded skeleton-shimmer" />
      ))}
    </div>
  );
}
