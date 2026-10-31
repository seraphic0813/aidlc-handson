export const categories = {
  pc: 'PC',
  software: 'ソフト',
  connection: '接続',
  other: 'その他',
} as const;
export const assignees = {
  desk_a: '窓口担当A',
  desk_b: '窓口担当B',
  desk_c: '窓口担当C',
} as const;
export const statuses = {
  open: '未対応',
  in_progress: '対応中',
  completed: '完了',
} as const;
export type Category = keyof typeof categories;
export type Assignee = keyof typeof assignees;
export type Status = keyof typeof statuses;
export interface Inquiry {
  ticketNumber: string;
  requesterName: string;
  subject: string;
  description: string;
  categoryCode: Category | null;
  assigneeCode: Assignee | null;
  status: Status;
  answer: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}
export interface Registration {
  requesterName: string;
  subject: string;
  description: string;
  categoryCode: Category | null;
}
export interface ResponseInput {
  assigneeCode: Assignee | null;
  status: Status;
  answer: string;
}
export interface Search {
  query: string;
  status: Status | 'all';
  page: number;
}
export interface SearchResult {
  items: Inquiry[];
  total: number;
  allTotal: number;
  page: number;
  pages: number;
  conditions: Search;
}
export interface SaveResult {
  inquiry: Inquiry;
  unchanged?: boolean;
  replayed?: boolean;
}
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
