export type ArticleSortDirection = 'asc' | 'desc';

export interface Article {
  id: number;
  title: string;
  content: string;
  photoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateArticleInput {
  title: string;
  content: string;
  photoUrl?: string | null;
}

export interface UpdateArticleInput {
  title?: string;
  content?: string;
  photoUrl?: string | null;
}

export interface GetArticlesByDatesParams {
  from: Date;
  to: Date;
  page: number;
  pageSize: number;
  sortDirection: ArticleSortDirection;

}

export interface ListArticlesParams {
  page: number;
  pageSize: number;
  sortDirection: ArticleSortDirection;
}
 