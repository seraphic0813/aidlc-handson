import { categories, type Registration } from '../../../shared/types.js';
import { TextInput } from '../atoms/TextInput.js';
import { TextArea } from '../atoms/TextArea.js';
import { Select } from '../atoms/Select.js';
import { Button } from '../atoms/Button.js';
import { FormField } from '../molecules/FormField.js';
export function InquiryForm({
  value,
  onChange,
  onSubmit,
  busy,
  locked,
  errors,
}: {
  value: Registration;
  onChange: (value: Registration) => void;
  onSubmit: () => void;
  busy: boolean;
  locked: boolean;
  errors: Record<string, string>;
}) {
  const update = (name: keyof Registration, text: string) =>
    onChange({
      ...value,
      [name]: name === 'categoryCode' ? text || null : text,
    });
  return (
    <form
      className="panel registration-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <h2>相談内容を記入</h2>
      <p className="hint">
        必須項目を入力してください。送信JSON全体は64KiB以内です。文字数内でもデータ量が超過する場合があります。
      </p>
      <FormField
        id="requesterName"
        label="申請者名（必須）"
        hint="架空の表示名 / 50文字以内"
        error={errors.requesterName}
      >
        <TextInput
          id="requesterName"
          value={value.requesterName}
          disabled={busy || locked}
          onChange={(e) => update('requesterName', e.target.value)}
          aria-invalid={!!errors.requesterName}
          aria-describedby={
            errors.requesterName ? 'requesterName-error' : 'requesterName-hint'
          }
        />
      </FormField>
      <FormField
        id="subject"
        label="件名（必須）"
        hint="100文字以内"
        error={errors.subject}
      >
        <TextInput
          id="subject"
          value={value.subject}
          disabled={busy || locked}
          onChange={(e) => update('subject', e.target.value)}
          aria-invalid={!!errors.subject}
          aria-describedby={errors.subject ? 'subject-error' : 'subject-hint'}
        />
      </FormField>
      <FormField
        id="categoryCode"
        label="分類（任意）"
        error={errors.categoryCode}
      >
        <Select
          id="categoryCode"
          value={value.categoryCode ?? ''}
          disabled={busy || locked}
          onChange={(e) => update('categoryCode', e.target.value)}
        >
          <option value="">未選択</option>
          {Object.entries(categories).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        id="description"
        label="問い合わせ内容（必須）"
        hint="状況や困っていること / 2000文字以内"
        error={errors.description}
      >
        <TextArea
          id="description"
          rows={7}
          value={value.description}
          disabled={busy || locked}
          onChange={(e) => update('description', e.target.value)}
          aria-invalid={!!errors.description}
          aria-describedby={
            errors.description ? 'description-error' : 'description-hint'
          }
        />
      </FormField>
      <div className="form-actions">
        <Button type="submit" disabled={busy}>
          {busy
            ? '登録処理中…'
            : locked
              ? '同じ内容で受付結果を確認'
              : '問い合わせを登録する'}
        </Button>
        <span className="hint">入力内容は自動保存されません。</span>
      </div>
    </form>
  );
}
