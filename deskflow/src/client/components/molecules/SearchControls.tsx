import { useState } from 'react';
import { statuses, type Search } from '../../../shared/types.js';
import { TextInput } from '../atoms/TextInput.js';
import { Select } from '../atoms/Select.js';
import { Button } from '../atoms/Button.js';
import { FormField } from './FormField.js';
export function SearchControls({
  conditions,
  onSearch,
}: {
  conditions: Search;
  onSearch: (value: Search) => void;
}) {
  const [query, setQuery] = useState(conditions.query);
  const [status, setStatus] = useState(conditions.status);
  return (
    <form
      className="search-controls"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch({ query, status, page: 1 });
      }}
    >
      <FormField
        id="query"
        label="検索語"
        hint="件名・内容・回答・申請者・担当者 / 100文字以内"
      >
        <TextInput
          id="query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="過去の問い合わせを探す"
        />
      </FormField>
      <FormField id="filter" label="状況">
        <Select
          id="filter"
          value={status}
          onChange={(e) => setStatus(e.target.value as Search['status'])}
        >
          <option value="all">全件</option>
          {Object.entries(statuses).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </Select>
      </FormField>
      <Button type="submit">検索する</Button>
      <Button
        className="secondary"
        onClick={() => {
          setQuery('');
          setStatus('all');
          onSearch({ query: '', status: 'all', page: 1 });
        }}
      >
        条件を解除
      </Button>
    </form>
  );
}
