import type { TextareaHTMLAttributes } from 'react';
export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea data-testid="text-area" className="input textarea" {...props} />
  );
}
