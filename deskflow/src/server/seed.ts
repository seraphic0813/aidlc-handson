import type { Inquiry, Status } from '../shared/types.js';
export function initialInquiries(): Inquiry[] {
  const subjects = [
    'ネットワークにつながらない',
    '表計算ソフトが起動しない',
    'プリンターを利用できない',
    'PCの画面が暗い',
    'ソフトの更新方法を知りたい',
    '無線接続が不安定',
    'ファイルの保存場所を確認したい',
    'キーボードの設定',
    '会議アプリの音声設定',
    '外部画面への接続',
  ];
  return subjects.map((subject, index) => {
    const status: Status =
      index < 4 ? 'open' : index < 7 ? 'in_progress' : 'completed';
    const date = new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString();
    return {
      ticketNumber: `DF-${String(index + 1).padStart(6, '0')}`,
      requesterName: `架空社員${index + 1}`,
      subject,
      description: `演習用の架空の問い合わせです。${subject}。操作手順を教えてください。`,
      categoryCode: (['pc', 'software', 'connection', 'other', null] as const)[
        index % 5
      ],
      assigneeCode:
        index % 4 === 0
          ? null
          : (['desk_a', 'desk_b', 'desk_c'] as const)[index % 3],
      status,
      answer:
        status === 'completed'
          ? '設定を確認して再接続する方法を案内し、解決しました。'
          : '',
      createdAt: date,
      updatedAt: date,
      version: 1,
    };
  });
}
