"use client";

export default function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center justify-between animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-4 rounded" style={{ width: `${75 - i * 5}%` }} />
            <div className="skeleton h-3 rounded" style={{ width: `${50 - i * 3}%` }} />
          </div>
          <div className="skeleton h-6 w-12 rounded ml-3" />
        </div>
      ))}
    </div>
  );
}
