/**
 * Chat Skeleton — loading placeholder for the chat panel.
 */

export function ChatSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className={`flex gap-3 ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
        >
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-surface-raised" />
          <div className={`flex flex-col gap-1.5 ${i % 2 === 0 ? 'items-start' : 'items-end'}`}>
            <div
              className="animate-pulse rounded-2xl bg-surface-raised"
              style={{
                width: `${140 + Math.random() * 200}px`,
                height: `${32 + Math.random() * 24}px`,
              }}
            />
            <div className="h-2 w-16 animate-pulse rounded bg-surface-raised" />
          </div>
        </div>
      ))}
    </div>
  );
}
