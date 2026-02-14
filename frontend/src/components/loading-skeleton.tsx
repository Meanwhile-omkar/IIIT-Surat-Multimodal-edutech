interface LoadingSkeletonProps {
  type?: "card" | "list" | "concept-list" | "text";
  count?: number;
}

export function LoadingSkeleton({ type = "card", count = 1 }: LoadingSkeletonProps) {
  if (type === "card") {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 animate-pulse"
          >
            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-4/6"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "list") {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-800 rounded-md animate-pulse"
          >
            <div className="h-4 w-4 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded flex-1"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "concept-list") {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 animate-pulse"
          >
            <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-3"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "text") {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full"
          ></div>
        ))}
      </div>
    );
  }

  return null;
}
