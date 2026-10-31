// @vitest-environment jsdom
import '../setup-dom.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppError, type Inquiry } from '../../src/shared/types.js';
import { api } from '../../src/client/api.js';
import { RegisterPage } from '../../src/client/pages/RegisterPage.js';
import { ResponseEditor } from '../../src/client/components/organisms/ResponseEditor.js';
import { ListPage } from '../../src/client/pages/ListPage.js';
import { App } from '../../src/client/App.js';
vi.mock('../../src/client/api.js', () => ({
  api: {
    register: vi.fn(),
    save: vi.fn(),
    reopen: vi.fn(),
    detail: vi.fn(),
    search: vi.fn(),
  },
}));
const inquiry: Inquiry = {
  ticketNumber: 'DF-000011',
  requesterName: '社員',
  subject: '接続の相談',
  description: '接続できません',
  categoryCode: 'connection',
  assigneeCode: null,
  status: 'in_progress',
  answer: '',
  version: 1,
  createdAt: '2026-10-25T01:00:00Z',
  updatedAt: '2026-10-25T01:00:00Z',
};
const dirty = vi.fn();
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => {
    f(0);
    return 1;
  });
});
function fill() {
  fireEvent.change(screen.getByLabelText(/申請者名/), {
    target: { value: '社員' },
  });
  fireEvent.change(screen.getByLabelText(/件名/), {
    target: { value: '相談' },
  });
  fireEvent.change(screen.getByLabelText(/^問い合わせ内容/), {
    target: { value: '困っています' },
  });
}
describe('登録の操作', () => {
  it('ラベルから登録し受付番号を表示、別件は空欄に戻す', async () => {
    vi.mocked(api.register).mockResolvedValue({ inquiry });
    render(<RegisterPage onDirty={dirty} />);
    fill();
    fireEvent.click(
      screen.getByRole('button', { name: '問い合わせを登録する' }),
    );
    expect(await screen.findByText('DF-000011')).toBeVisible();
    fireEvent.click(
      screen.getByRole('button', { name: '別の問い合わせを登録する' }),
    );
    expect(screen.getByLabelText(/申請者名/)).toHaveValue('');
  });
  it('必須不備は通信せず入力を保持する', async () => {
    render(<RegisterPage onDirty={dirty} />);
    fireEvent.change(screen.getByLabelText(/件名/), {
      target: { value: '保持' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: '問い合わせを登録する' }),
    );
    await screen.findByRole('alert');
    expect(api.register).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/件名/)).toHaveValue('保持');
  });
  it('確定した拒否は入力を保持し再編集できる', async () => {
    vi.mocked(api.register).mockRejectedValue(
      new AppError('VALIDATION', '入力を確認してください'),
    );
    render(<RegisterPage onDirty={dirty} />);
    fill();
    fireEvent.click(
      screen.getByRole('button', { name: '問い合わせを登録する' }),
    );
    await screen.findByRole('alert');
    expect(screen.getByLabelText(/件名/)).toHaveValue('相談');
    expect(screen.getByLabelText(/件名/)).toBeEnabled();
  });
  it('通信結果不明は入力を固定し同じキーで再送する', async () => {
    vi.mocked(api.register)
      .mockRejectedValueOnce(new AppError('RESULT_UNKNOWN', '結果不明'))
      .mockResolvedValue({ inquiry });
    render(<RegisterPage onDirty={dirty} />);
    fill();
    fireEvent.click(
      screen.getByRole('button', { name: '問い合わせを登録する' }),
    );
    await screen.findByRole('alert');
    expect(screen.getByLabelText(/件名/)).toBeDisabled();
    fireEvent.click(screen.getByRole('button'));
    await screen.findByText('DF-000011');
    expect(vi.mocked(api.register).mock.calls[0][1]).toBe(
      vi.mocked(api.register).mock.calls[1][1],
    );
  });
  it('書記素内でも64KiB超過を送らない', async () => {
    render(<RegisterPage onDirty={dirty} />);
    fill();
    fireEvent.change(screen.getByLabelText(/^問い合わせ内容/), {
      target: { value: 'a' + '\u0301'.repeat(40000) },
    });
    fireEvent.click(
      screen.getByRole('button', { name: '問い合わせを登録する' }),
    );
    await screen.findByRole('alert');
    expect(api.register).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^問い合わせ内容/)).toHaveValue(
      'a' + '\u0301'.repeat(40000),
    );
  });
  it('未保存の移動はキャンセル可能', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /問い合わせを登録/ }));
    fireEvent.change(screen.getByLabelText(/件名/), {
      target: { value: '保持' },
    });
    fireEvent.click(screen.getByRole('button', { name: '入口へ戻る' }));
    expect(window.confirm).toHaveBeenCalled();
    expect(screen.getByLabelText(/件名/)).toHaveValue('保持');
  });
});
describe('対応の操作', () => {
  it('回答・担当・状態を保存する', async () => {
    vi.mocked(api.save).mockResolvedValue({
      inquiry: { ...inquiry, answer: '解決', status: 'completed', version: 2 },
    });
    render(<ResponseEditor inquiry={inquiry} onDirty={dirty} />);
    fireEvent.change(screen.getByLabelText('回答'), {
      target: { value: '解決' },
    });
    fireEvent.change(screen.getByLabelText('状況'), {
      target: { value: 'completed' },
    });
    fireEvent.click(screen.getByRole('button', { name: '対応内容を保存する' }));
    expect(await screen.findByText('記録した回答')).toBeVisible();
    expect(api.save).toHaveBeenCalledWith(
      inquiry.ticketNumber,
      1,
      expect.objectContaining({ answer: '解決', status: 'completed' }),
    );
  });
  it('失敗しても回答を保持する', async () => {
    vi.mocked(api.save).mockRejectedValue(
      new AppError('VALIDATION', '回答を確認'),
    );
    render(<ResponseEditor inquiry={inquiry} onDirty={dirty} />);
    fireEvent.change(screen.getByLabelText('回答'), {
      target: { value: '下書き' },
    });
    fireEvent.click(screen.getByRole('button', { name: '対応内容を保存する' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('回答')).toHaveValue('下書き');
  });
  it('競合時は入力と最新内容を比較して版を選び直す', async () => {
    vi.mocked(api.save).mockRejectedValue(
      new AppError('VERSION_CONFLICT', '他のタブで変更'),
    );
    vi.mocked(api.detail).mockResolvedValue({
      ...inquiry,
      answer: '他の回答',
      version: 2,
    });
    render(<ResponseEditor inquiry={inquiry} onDirty={dirty} />);
    fireEvent.change(screen.getByLabelText('回答'), {
      target: { value: '自分の回答' },
    });
    fireEvent.click(screen.getByRole('button', { name: '対応内容を保存する' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: '最新内容を確認する' }));
    await screen.findByText('他の回答');
    fireEvent.click(
      screen.getByRole('button', { name: '最新の版で入力を見直す' }),
    );
    expect(screen.getByLabelText('回答')).toHaveValue('自分の回答');
    expect(
      screen.getByRole('button', { name: '対応内容を保存する' }),
    ).toBeEnabled();
  });
  it('完了から再開し記録済み回答を保持する', async () => {
    vi.mocked(api.reopen).mockResolvedValue({
      inquiry: { ...inquiry, answer: '既存回答', version: 3 },
    });
    render(
      <ResponseEditor
        inquiry={{
          ...inquiry,
          status: 'completed',
          answer: '既存回答',
          version: 2,
        }}
        onDirty={dirty}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '対応中へ再開する' }));
    expect(await screen.findByLabelText('回答')).toHaveValue('既存回答');
    expect(api.reopen).toHaveBeenCalledWith(inquiry.ticketNumber, 2);
  });
  it('変更なしの成功を通知する', async () => {
    vi.mocked(api.save).mockResolvedValue({ inquiry, unchanged: true });
    render(<ResponseEditor inquiry={inquiry} onDirty={dirty} />);
    fireEvent.click(screen.getByRole('button', { name: '対応内容を保存する' }));
    expect(await screen.findByText('変更はありません')).toBeVisible();
  });
  it('最新内容の読込失敗も入力を保持する', async () => {
    vi.mocked(api.save).mockRejectedValue(
      new AppError('RESULT_UNKNOWN', '不明'),
    );
    vi.mocked(api.detail).mockRejectedValue(new Error('network'));
    render(<ResponseEditor inquiry={inquiry} onDirty={dirty} />);
    fireEvent.change(screen.getByLabelText('回答'), {
      target: { value: '保持' },
    });
    fireEvent.click(screen.getByRole('button', { name: '対応内容を保存する' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: '最新内容を確認する' }));
    await screen.findByText('最新内容を読めませんでした。');
    expect(screen.getByLabelText('回答')).toHaveValue('保持');
  });
});
describe('一覧と入口', () => {
  it('条件0件は総数0件と区別する', async () => {
    vi.mocked(api.search).mockResolvedValue({
      items: [],
      total: 0,
      allTotal: 10,
      page: 1,
      pages: 1,
      conditions: { query: 'なし', status: 'all', page: 1 },
    });
    render(
      <ListPage
        conditions={{ query: 'なし', status: 'all', page: 1 }}
        onConditions={vi.fn()}
        onOpen={vi.fn()}
      />,
    );
    expect(
      await screen.findByText('条件に一致する問い合わせがありません'),
    ).toBeVisible();
  });
  it('読込失敗から再試行する', async () => {
    vi.mocked(api.search)
      .mockRejectedValueOnce(new AppError('READ', '読込失敗'))
      .mockResolvedValue({
        items: [inquiry],
        total: 1,
        allTotal: 1,
        page: 1,
        pages: 1,
        conditions: { query: '', status: 'all', page: 1 },
      });
    render(
      <ListPage
        conditions={{ query: '', status: 'all', page: 1 }}
        onConditions={vi.fn()}
        onOpen={vi.fn()}
      />,
    );
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: '再試行する' }));
    expect(await screen.findByText('接続の相談')).toBeVisible();
  });
  it('入口から一覧・詳細へ移動して条件を保持する', async () => {
    vi.mocked(api.search).mockResolvedValue({
      items: [inquiry],
      total: 1,
      allTotal: 1,
      page: 1,
      pages: 1,
      conditions: { query: '', status: 'all', page: 1 },
    });
    vi.mocked(api.detail).mockResolvedValue(inquiry);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /一覧/ }));
    fireEvent.click(await screen.findByText('接続の相談'));
    await screen.findByLabelText('回答');
    fireEvent.click(screen.getByRole('button', { name: /一覧へ戻る/ }));
    await waitFor(() => expect(api.search).toHaveBeenCalledTimes(2));
  });
});
