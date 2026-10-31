import { useEffect, useRef, useState } from 'react';
import {
  AppError,
  type Registration,
  type Inquiry,
} from '../../shared/types.js';
import { registration, checkBodySize } from '../../shared/input-policy.js';
import { api } from '../api.js';
import { InquiryForm } from '../components/organisms/InquiryForm.js';
import { Feedback } from '../components/molecules/Feedback.js';
import { Button } from '../components/atoms/Button.js';
const empty = (): Registration => ({
  requesterName: '',
  subject: '',
  description: '',
  categoryCode: null,
});
export function RegisterPage({
  onDirty,
}: {
  onDirty: (value: boolean) => void;
}) {
  const [value, setValue] = useState(empty);
  const [receipt, setReceipt] = useState<Inquiry | null>(null);
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const operation = useRef<{ key: string; input: Registration | null }>({
    key: crypto.randomUUID(),
    input: null,
  });
  const inFlight = useRef(false);
  useEffect(() => {
    onDirty(!receipt && (Object.values(value).some(Boolean) || locked));
  }, [value, receipt, locked, onDirty]);
  async function submit() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const input = operation.current.input ?? registration(value);
      const payload = { input, submissionKey: operation.current.key };
      checkBodySize(payload);
      operation.current.input = input;
      const result = await api.register(input, operation.current.key);
      setReceipt(result.inquiry);
      setLocked(false);
      onDirty(false);
    } catch (problem) {
      const failure =
        problem instanceof AppError
          ? problem
          : new AppError(
              'RESULT_UNKNOWN',
              '受付結果を確認できませんでした。',
              0,
            );
      setError(failure);
      if (failure.code === 'RESULT_UNKNOWN') setLocked(true);
      else operation.current.input = null;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  if (receipt)
    return (
      <section className="panel success-panel">
        <span className="success-symbol">✓</span>
        <h2>問い合わせを登録しました</h2>
        <p className="receipt-number">{receipt.ticketNumber}</p>
        <p>{receipt.subject}</p>
        <p className="hint">
          登録内容を受け付けました。窓口担当者の対応を待ちます。
        </p>
        <Button
          onClick={() => {
            setReceipt(null);
            setValue(empty());
            setError(null);
            operation.current = { key: crypto.randomUUID(), input: null };
          }}
        >
          別の問い合わせを登録する
        </Button>
      </section>
    );
  return (
    <>
      <Feedback message={error?.message ?? ''} error={!!error} />
      <InquiryForm
        value={value}
        onChange={(next) => {
          setValue(next);
          operation.current = { key: crypto.randomUUID(), input: null };
        }}
        onSubmit={() => void submit()}
        busy={busy}
        locked={locked}
        errors={error?.fields ?? {}}
      />
    </>
  );
}
