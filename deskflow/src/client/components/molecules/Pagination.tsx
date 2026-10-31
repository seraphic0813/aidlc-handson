import { Button } from '../atoms/Button.js';
export function Pagination({
  page,
  pages,
  onPage,
  disabled = false,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
  disabled?: boolean;
}) {
  return (
    <nav className="pagination" aria-label="一覧のページ">
      <span>
        {page} / {pages}ページ
      </span>
      <Button
        className="secondary"
        disabled={disabled || page <= 1}
        onClick={() => onPage(page - 1)}
      >
        前のページ
      </Button>
      <Button
        className="secondary"
        disabled={disabled || page >= pages}
        onClick={() => onPage(page + 1)}
      >
        次のページ
      </Button>
    </nav>
  );
}
