import { useEffect, useRef } from 'react';
export function Feedback({
  message,
  error = false,
}: {
  message: string;
  error?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error && message) ref.current?.focus();
  }, [message, error]);
  return message ? (
    <div
      ref={ref}
      tabIndex={-1}
      role={error ? 'alert' : 'status'}
      className={`feedback ${error ? 'feedback-error' : ''}`}
    >
      {message}
    </div>
  ) : null;
}
