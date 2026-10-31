import { useState } from 'react';
import type { Search } from '../shared/types.js';
import { useNavigation, type View } from './hooks/useNavigation.js';
import { PageLayout } from './components/templates/PageLayout.js';
import { Button } from './components/atoms/Button.js';
import { EntryPage } from './pages/EntryPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { ListPage } from './pages/ListPage.js';
import { DetailPage } from './pages/DetailPage.js';
export function App() {
  const [dirty, setDirty] = useState(false);
  const { view, navigate } = useNavigation(dirty);
  const [conditions, setConditions] = useState<Search>({
    query: '',
    status: 'all',
    page: 1,
  });
  function go(next: View) {
    if (navigate(next)) {
      setDirty(false);
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('#main')?.focus(),
      );
    }
  }
  const title =
    view.kind === 'entry'
      ? '利用する画面を選んでください'
      : view.kind === 'register'
        ? '問い合わせを登録'
        : view.kind === 'list'
          ? '問い合わせ一覧'
          : '問い合わせ詳細';
  const eyebrow =
    view.kind === 'entry'
      ? 'WELCOME'
      : view.kind === 'register'
        ? 'NEW REQUEST'
        : view.kind === 'list'
          ? 'INQUIRIES'
          : 'INQUIRY DETAILS';
  return (
    <PageLayout
      title={title}
      eyebrow={eyebrow}
      onEntry={() => go({ kind: 'entry' })}
      action={
        view.kind === 'detail' ? (
          <Button className="secondary" onClick={() => go({ kind: 'list' })}>
            ← 一覧へ戻る
          </Button>
        ) : view.kind !== 'entry' ? (
          <Button className="secondary" onClick={() => go({ kind: 'entry' })}>
            入口へ戻る
          </Button>
        ) : undefined
      }
    >
      {view.kind === 'entry' ? (
        <EntryPage
          onRegister={() => go({ kind: 'register' })}
          onList={() => go({ kind: 'list' })}
        />
      ) : view.kind === 'register' ? (
        <RegisterPage onDirty={setDirty} />
      ) : view.kind === 'list' ? (
        <ListPage
          conditions={conditions}
          onConditions={setConditions}
          onOpen={(ticket) => go({ kind: 'detail', ticket })}
        />
      ) : (
        <DetailPage key={view.ticket} ticket={view.ticket} onDirty={setDirty} />
      )}
    </PageLayout>
  );
}
