import { describe, expect, it } from 'vitest';
import {
  checkBodySize,
  graphemeCount,
  jsonBytes,
  normalizeSearch,
  registration,
  responseInput,
  searchText,
  submissionKey,
  ticket,
  version,
} from '../../src/shared/input-policy.js';
const base = {
  requesterName: '社員',
  subject: '件名',
  description: '本文',
  categoryCode: null,
};
describe('入力方針', () => {
  it('前後空白を除き途中改行を保持する', () =>
    expect(
      registration({ ...base, description: ' 本文\n 次行 ' }),
    ).toMatchObject({ description: '本文\n 次行' }));
  it('必須空白を拒否する', () =>
    expect(() => registration({ ...base, subject: '　 ' })).toThrow('件名'));
  it('各最大長を受け付ける', () =>
    expect(
      registration({
        requesterName: '名'.repeat(50),
        subject: '題'.repeat(100),
        description: '文'.repeat(2000),
        categoryCode: 'pc',
      }).description,
    ).toHaveLength(2000));
  it('1文字超過を拒否する', () =>
    expect(() =>
      registration({ ...base, requesterName: 'あ'.repeat(51) }),
    ).toThrow());
  it('結合文字と複合絵文字は書記素で数える', () => {
    expect(graphemeCount('a\u0301')).toBe(1);
    expect(graphemeCount('👨‍👩‍👧‍👦')).toBe(1);
  });
  it('不正な型・未知項目・分類を拒否する', () => {
    expect(() => registration({ ...base, subject: 5 })).toThrow();
    expect(() => registration({ ...base, other: 'x' })).toThrow();
    expect(() => registration({ ...base, categoryCode: 'unknown' })).toThrow();
  });
  it('回答と担当と状態を検証する', () => {
    expect(
      responseInput({ assigneeCode: null, status: 'in_progress', answer: ' ' })
        .answer,
    ).toBe('');
    expect(() =>
      responseInput({ assigneeCode: 'x', status: 'open', answer: '' }),
    ).toThrow();
    expect(() =>
      responseInput({ assigneeCode: null, status: 'x', answer: '' }),
    ).toThrow();
  });
  it('検索比較だけを正規化する', () => {
    expect(normalizeSearch('ＡＢＣ')).toBe('abc');
    expect(searchText(' 語 句 ')).toBe('語 句');
    expect(() => searchText('a'.repeat(101))).toThrow();
  });
  it('識別子と版の不正を拒否する', () => {
    expect(ticket('DF-000011')).toBe('DF-000011');
    expect(() => ticket('../')).toThrow();
    expect(() => version('1')).toThrow();
    expect(() => version(0)).toThrow();
    expect(() => submissionKey('a b')).toThrow();
  });
  it('JSON本文全体の65536バイトは許可、65537は拒否する', () => {
    const n = jsonBytes({ value: '' });
    const ok = { value: 'a'.repeat(65536 - n) };
    expect(jsonBytes(ok)).toBe(65536);
    expect(() => checkBodySize(ok)).not.toThrow();
    expect(() => checkBodySize({ value: ok.value + 'a' })).toThrow('64KiB');
  });
  it('書記素数内でも結合記号のデータ量超過を拒否する', () => {
    const value = 'a' + '\u0301'.repeat(32768);
    expect(graphemeCount(value)).toBe(1);
    expect(() => checkBodySize({ value })).toThrow();
  });
});
