import { useEffect, useState } from 'react';
export type View =
  | { kind: 'entry' }
  | { kind: 'register' }
  | { kind: 'list' }
  | { kind: 'detail'; ticket: string };
export function useNavigation(dirty: boolean) {
  const [view, setView] = useState<View>({ kind: 'entry' });
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);
  function navigate(next: View): boolean {
    if (
      dirty &&
      !window.confirm(
        '未保存の入力があります。破棄して移動しますか？ キャンセルで入力に戻ります。',
      )
    )
      return false;
    setView(next);
    return true;
  }
  return { view, navigate };
}
