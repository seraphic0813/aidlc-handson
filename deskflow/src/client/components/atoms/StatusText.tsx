import { statuses, type Status } from '../../../shared/types.js';
export function StatusText({ status }: { status: Status }) {
  return <span className={`status status-${status}`}>{statuses[status]}</span>;
}
