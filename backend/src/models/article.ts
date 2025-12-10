export type ArticleSortDirection = 'asc' | 'desc';

export interface ArticleRecord {
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
 