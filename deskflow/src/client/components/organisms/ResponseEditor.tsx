import { useEffect, useRef, useState } from 'react';
import {
  AppError,
  assignees,
  statuses,
  type Inquiry,
  type ResponseInput,
  type Status,
} from '../../../shared/types.js';
import { responseInput, checkBodySize } from '../../../shared/input-policy.js';
import { api } from '../../api.js';
import { Button } from '../atoms/Button.js';
import { Select } from '../atoms/Select.js';
import { TextArea } from '../atoms/TextArea.js';
import { StatusText } from '../atoms/StatusText.js';
import { FormField } from '../molecules/FormField.js';
import { Feedback } from '../molecules/Feedback.js';
function responseOf(value: Inquiry): ResponseInput {
  return {
    assigneeCode: value.assigneeCode,
    status: value.status,
    answer: value.answer,
  };
}
export function ResponseEditor({
  inquiry,
  onDirty,
}: {
  inquiry: Inquiry;
  onDirty: (value: boolean) => void;
}) {
  const [base, setBase] = useState(inquiry);
  const [draft, setDraft] = useState(() => responseOf(inquiry));
  const [latest, setLatest] = useState<Inquiry | null>(null);
  const [failure, setFailure] = useState<AppError | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(responseOf(base));
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  async function save(reopen = false) {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setFailure(null);
    setMessage('');
    try {
      const input = reopen ? undefined : responseInput(draft);
      checkBodySize(
        reopen
          ? { expectedVersion: base.version }
          : { expectedVersion: base.version, input },
      );
      const result = reopen
        ? await api.reopen(base.ticketNumber, base.version)
        : await api.save(base.ticketNumber, base.version, input!);
      setBase(result.inquiry);
      setDraft(responseOf(result.inquiry));
      setLatest(null);
      setMessage(
        result.unchanged
          ? '変更はありません'
          : reopen
            ? '対応中へ再開しました'
            : '対応内容を保存しました',
      );
      onDirty(false);
    } catch (error) {
      setFailure(
        error instanceof AppError
          ? error
          : new AppError('RESULT_UNKNOWN', '結果を確認できませんでした。', 0),
      );
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  async function loadLatest() {
    setBusy(true);
    try {
      setLatest(await api.detail(base.ticketNumber));
    } catch (error) {
      setFailure(
        error instanceof AppError
          ? error
          : new AppError('READ_FAILED', '最新内容を読めませんでした。'),
      );
    } finally {
      setBusy(false);
    }
  }
  const conflict =
    failure?.code === 'VERSION_CONFLICT' || failure?.code === 'RESULT_UNKNOWN';
  const allowed: Status[] =
    base.status === 'open'
      ? ['open', 'in_progress']
      : ['in_progress', 'completed'];
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>対応</h2>
        <StatusText status={base.status} />
      </div>
      <Feedback message={failure?.message ?? message} error={!!failure} />
      {conflict && (
        <div className="conflict">
          <p>
            入力中の内容は保持しています。保存前に最新内容を確認してください。
          </p>
          <Button
            className="secondary"
            disabled={busy}
            onClick={() => void loadLatest()}
          >
            最新内容を確認する
          </Button>
          {latest && (
            <div>
              <h3>最新の保存済み内容（版{latest.version}）</h3>
              <p>
                担当：
                {latest.assigneeCode
                  ? assignees[latest.assigneeCode]
                  : '未割当'}{' '}
                / 状況：{statuses[latest.status]}
              </p>
              <p className="long-text">{latest.answer || '回答未記入'}</p>
              <Button
                className="secondary"
                onClick={() => {
                  setBase(latest);
                  setLatest(null);
                  setFailure(null);
                  setMessage('入力を見直して、保存するか判断してください。');
                }}
              >
                最新の版で入力を見直す
              </Button>
            </div>
          )}
        </div>
      )}
      {base.status === 'completed' ? (
        <>
          <p>
            担当：{base.assigneeCode ? assignees[base.assigneeCode] : '未割当'}
          </p>
          <h3>記録した回答</h3>
          <p className="long-text">{base.answer}</p>
          {dirty && (
            <div className="conflict">
              <h3>保存前の入力</h3>
              <p className="long-text">{draft.answer || '回答未記入'}</p>
            </div>
          )}
          <Button disabled={busy} onClick={() => void save(true)}>
            対応中へ再開する
          </Button>
        </>
      ) : (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <FormField
            id="assignee"
            label="担当者"
            error={failure?.fields.assigneeCode}
          >
            <Select
              id="assignee"
              disabled={busy}
              value={draft.assigneeCode ?? ''}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  assigneeCode: (event.target.value ||
                    null) as ResponseInput['assigneeCode'],
                })
              }
            >
              <option value="">未割当</option>
              {Object.entries(assignees).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="status" label="状況" error={failure?.fields.status}>
            <Select
              id="status"
              disabled={busy}
              value={draft.status}
              onChange={(e) =>
                setDraft({ ...draft, status: e.target.value as Status })
              }
            >
              {allowed.map((code) => (
                <option key={code} value={code}>
                  {statuses[code]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            id="answer"
            label="回答"
            hint="下書き保存できます。完了時は必須 / 2000文字以内・送信全体64KiB以内"
            error={failure?.fields.answer}
          >
            <TextArea
              id="answer"
              rows={7}
              disabled={busy}
              value={draft.answer}
              onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
              aria-invalid={!!failure?.fields.answer}
              aria-describedby={
                failure?.fields.answer ? 'answer-error' : 'answer-hint'
              }
            />
          </FormField>
          <Button type="submit" disabled={busy || !!conflict}>
            {busy ? '保存処理中…' : '対応内容を保存する'}
          </Button>
        </form>
      )}
      <p className="hint">
        更新版 {base.version} · 完了後は再開してから修正できます。
      </p>
    </section>
  );
}
