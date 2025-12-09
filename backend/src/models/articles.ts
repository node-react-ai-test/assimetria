import type { QueryResultRow } from 'pg';

import { runQuery } from '../db';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

interface ArticleDbRow extends QueryResultRow {
  id: number | string;
  title: string;
  content: string;
  photo_url: string | null;
  created_at: Date;
  updated_at: Date;
}

interface CountRow extends QueryResultRow {
  total: string;
}

const ARTICLE_COLUMNS = `
  id,
  title,
  content,
  photo_url,
  created_at,
  updated_at
`;

export interface ArticleRecord {
  id: number;
  title: string;
  content: string;
  photoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArticleCreateInput {
  title: string;
  content: string;
  photoUrl?: string | null;
}

export interface ArticleUpdateInput {
  title?: string;
  content?: string;
  photoUrl?: string | null;
}

export interface ArticlePaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedArticles {
  items: ArticleRecord[];
  pagination: PaginationMeta;
}

const mapArticleRow = (row: ArticleDbRow): ArticleRecord => ({
  id: typeof row.id === 'string' ? Number.parseInt(row.id, 10) : row.id,
  title: row.title,
  content: row.content,
  photoUrl: row.photo_url ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const normalizePage = (page?: number): number => {
  if (!Number.isFinite(page)) {
    return 1;
  }

  return Math.max(1, Math.trunc(page as number));
};

const normalizePageSize = (pageSize?: number): number => {
  if (!Number.isFinite(pageSize)) {
    return DEFAULT_PAGE_SIZE;
  }

  const normalized = Math.max(1, Math.trunc(pageSize as number));
  return Math.min(MAX_PAGE_SIZE, normalized);
};

const parseTotalItems = (value: string | undefined): number => {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const countArticles = async (): Promise<number> => {
  const result = await runQuery<CountRow>('SELECT COUNT(*)::bigint AS total FROM articles');
  return parseTotalItems(result.rows[0]?.total);
};

export const createArticle = async (input: ArticleCreateInput): Promise<ArticleRecord> => {
  const result = await runQuery<ArticleDbRow>(
    `
      INSERT INTO articles (title, content, photo_url)
      VALUES ($1, $2, $3)
      RETURNING ${ARTICLE_COLUMNS}
    `,
    [input.title, input.content, input.photoUrl ?? null],
  );

  return mapArticleRow(result.rows[0]);
};

export const updateArticle = async (articleId: number, input: ArticleUpdateInput): Promise<ArticleRecord | null> => {
  const updates: string[] = [];
  const params: Array<string | number | null> = [];

  if (input.title !== undefined) {
    params.push(input.title);
    updates.push(`title = $${params.length}`);
  }

  if (input.content !== undefined) {
    params.push(input.content);
    updates.push(`content = $${params.length}`);
  }

  if (input.photoUrl !== undefined) {
    params.push(input.photoUrl);
    updates.push(`photo_url = $${params.length}`);
  }

  if (updates.length === 0) {
    return findArticleById(articleId);
  }

  params.push(articleId);

  const result = await runQuery<ArticleDbRow>(
    `
      UPDATE articles
      SET ${updates.join(', ')}
      WHERE id = $${params.length}
      RETURNING ${ARTICLE_COLUMNS}
    `,
    params,
  );

  const row = result.rows[0];
  return row ? mapArticleRow(row) : null;
};

export const deleteArticle = async (articleId: number): Promise<boolean> => {
  const result = await runQuery(
    `
      DELETE FROM articles
      WHERE id = $1
      RETURNING id
    `,
    [articleId],
  );

  return result.rowCount > 0;
};

export const findArticleById = async (articleId: number): Promise<ArticleRecord | null> => {
  const result = await runQuery<ArticleDbRow>(
    `
      SELECT ${ARTICLE_COLUMNS}
      FROM articles
      WHERE id = $1
      LIMIT 1
    `,
    [articleId],
  );

  const row = result.rows[0];
  return row ? mapArticleRow(row) : null;
};

export const findLatestArticle = async (): Promise<ArticleRecord | null> => {
  const result = await runQuery<ArticleDbRow>(
    `
      SELECT ${ARTICLE_COLUMNS}
      FROM articles
      ORDER BY created_at DESC
      LIMIT 1
    `,
  );

  const row = result.rows[0];
  return row ? mapArticleRow(row) : null;
};

export const findArticlesPage = async (
  options: ArticlePaginationOptions = {},
): Promise<PaginatedArticles> => {
  const page = normalizePage(options.page);
  const pageSize = normalizePageSize(options.pageSize);
  const offset = (page - 1) * pageSize;

  const [itemsResult, totalResult] = await Promise.all([
    runQuery<ArticleDbRow>(
      `
        SELECT ${ARTICLE_COLUMNS}
        FROM articles
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `,
      [pageSize, offset],
    ),
    runQuery<CountRow>('SELECT COUNT(*)::bigint AS total FROM articles'),
  ]);

  const totalItems = parseTotalItems(totalResult.rows[0]?.total);
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0;

  return {
    items: itemsResult.rows.map(mapArticleRow),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};
