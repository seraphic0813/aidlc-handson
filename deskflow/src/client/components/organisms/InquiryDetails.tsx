import { categories, type Inquiry } from '../../../shared/types.js';
export function InquiryDetails({ inquiry }: { inquiry: Inquiry }) {
  return (
    <section className="panel">
      <h2>問い合わせ内容</h2>
      <dl className="metadata">
        <div>
          <dt>申請者</dt>
          <dd>{inquiry.requesterName}</dd>
        </div>
        <div>
          <dt>分類</dt>
          <dd>
            {inquiry.categoryCode ? categories[inquiry.categoryCode] : '未選択'}
          </dd>
        </div>
        <div>
          <dt>登録日時</dt>
          <dd>
            {new Intl.DateTimeFormat('ja-JP', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'Asia/Tokyo',
            }).format(new Date(inquiry.createdAt))}
            （日本時間）
          </dd>
        </div>
      </dl>
      <p className="long-text">{inquiry.description}</p>
    </section>
  );
}
