import { useEffect, useState } from 'react';
import type { Inquiry } from '../../shared/types.js';
import { api } from '../api.js';
import { InquiryDetails } from '../components/organisms/InquiryDetails.js';
import { ResponseEditor } from '../components/organisms/ResponseEditor.js';
import { Feedback } from '../components/molecules/Feedback.js';
import { Button } from '../components/atoms/Button.js';
export function DetailPage({
  ticket,
  onDirty,
}: {
  ticket: string;
  onDirty: (value: boolean) => void;
}) {
  const [value, setValue] = useState<Inquiry | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    api
      .detail(ticket)
      .then((item) => {
        if (current) {
          setValue(item);
          setError('');
        }
      })
      .catch((problem) => {
        if (current)
          setError(
            problem instanceof Error
              ? problem.message
              : '詳細を読み込めませんでした。',
          );
      });
    return () => {
      current = false;
    };
  }, [ticket, retry]);
  return error ? (
    <>
      <Feedback message={error} error />
      <Button className="secondary" onClick={() => setRetry((n) => n + 1)}>
        再試行する
      </Button>
    </>
  ) : value ? (
    <>
      <div className="detail-title">
        <p className="ticket">{value.ticketNumber}</p>
        <h2>{value.subject}</h2>
      </div>
      <div className="detail-grid">
        <InquiryDetails inquiry={value} />
        <ResponseEditor inquiry={value} onDirty={onDirty} />
      </div>
    </>
  ) : (
    <p role="status">詳細を読込中…</p>
  );
}
