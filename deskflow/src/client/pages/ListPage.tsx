import { useEffect, useState } from 'react';
import {
  AppError,
  statuses,
  type Search,
  type SearchResult,
} from '../../shared/types.js';
import { api } from '../api.js';
import { SearchControls } from '../components/molecules/SearchControls.js';
import { Pagination } from '../components/molecules/Pagination.js';
import { Feedback } from '../components/molecules/Feedback.js';
import { InquiryTable } from '../components/organisms/InquiryTable.js';
import { Button } from '../components/atoms/Button.js';
export function ListPage({
  conditions,
  onConditions,
  onOpen,
}: {
  conditions: Search;
  onConditions: (value: Search) => void;
  onOpen: (ticket: string) => void;
}) {
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    api
      .search({
        query: conditions.query,
        status: conditions.status,
        page: conditions.page,
      })
      .then((value) => {
        if (current) {
          setResult(value);
          setLoading(false);
        }
      })
      .catch((problem) => {
        if (current) {
          setError(
            problem instanceof AppError
              ? problem.message
              : '一覧を読み込めませんでした。',
          );
          setLoading(false);
        }
      });
    return () => {
      current = false;
    };
  }, [conditions.query, conditions.status, conditions.page, retry]);
  return (
    <>
      <section className="panel search-panel">
        <SearchControls conditions={conditions} onSearch={onConditions} />
      </section>
      <section className="panel results-panel" aria-busy={loading}>
        <div className="section-heading">
          <h2>問い合わせ一覧</h2>
          <span className="hint">登録日時の新しい順 / 20件ずつ</span>
        </div>
        <p className="applied-conditions">
          適用条件：
          {conditions.query ? `「${conditions.query}」` : '検索語なし'} /{' '}
          {conditions.status === 'all' ? '全件' : statuses[conditions.status]}
        </p>
        {loading && <p role="status">一覧を読込中…</p>}
        {error ? (
          <>
            <Feedback message={error} error />
            <Button
              className="secondary"
              onClick={() => setRetry((n) => n + 1)}
            >
              再試行する
            </Button>
          </>
        ) : result && !loading ? (
          <>
            <p className="result-count">
              <strong>{result.total}</strong>件
              {result.page !== conditions.page && (
                <span> — ページを最後の有効な位置へ補正しました。</span>
              )}
            </p>
            {result.total === 0 ? (
              <div className="empty-state">
                <h3>
                  {result.allTotal === 0
                    ? '問い合わせはまだありません'
                    : '条件に一致する問い合わせがありません'}
                </h3>
                <p>検索条件を変更または解除してください。</p>
              </div>
            ) : (
              <InquiryTable items={result.items} onOpen={onOpen} />
            )}
            <Pagination
              page={result.page}
              pages={result.pages}
              onPage={(page) => onConditions({ ...conditions, page })}
            />
          </>
        ) : null}
      </section>
    </>
  );
}
