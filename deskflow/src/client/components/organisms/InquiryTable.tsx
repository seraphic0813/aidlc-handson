import { assignees, type Inquiry } from '../../../shared/types.js';
import { StatusText } from '../atoms/StatusText.js';
import { Button } from '../atoms/Button.js';
export function InquiryTable({
  items,
  onOpen,
}: {
  items: Inquiry[];
  onOpen: (ticket: string) => void;
}) {
  return (
    <div className="table-scroll">
      <table>
        <caption className="sr-only">問い合わせ一覧</caption>
        <thead>
          <tr>
            <th>受付番号</th>
            <th>件名</th>
            <th>担当者</th>
            <th>状況</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.ticketNumber}>
              <td className="ticket">{item.ticketNumber}</td>
              <td>
                <Button
                  className="text-button"
                  data-testid={`open-${item.ticketNumber}`}
                  onClick={() => onOpen(item.ticketNumber)}
                >
                  {item.subject}
                </Button>
              </td>
              <td>
                {item.assigneeCode ? assignees[item.assigneeCode] : '未割当'}
              </td>
              <td>
                <StatusText status={item.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
