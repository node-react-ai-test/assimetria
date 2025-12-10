import { QueryResult, QueryResultRow } from 'pg';

import { runQuery } from '../db';
import {
  ArticleRecord,
  ArticleSortDirection,
  CreateArticleInput,
  UpdateArticleInput,
} from '../models/article';

type QueryRunner = <T extends QueryResultRow = QueryResultRow>(
  queryText: string,
  params?: ReadonlyArray<unknown>,
) => Promise<QueryResult<T>>;

interface ArticleRow extends QueryResultRow {
  id: number;
  title: string;
  content: string;
  photo_url: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ListArticlesParams {
  page?: number;
  pageSize?: number;
  sortDirection?: ArticleSortDirection;
}

export interface PaginatedArticlesResult {
  data: ArticleRecord[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export class ArticleRepository {
  private readonly queryRunner: QueryRunner;

  constructor(dependencies?: { queryRunner?: QueryRunner }) {
    this.queryRunner = dependencies?.queryRunner ?? runQuery;
  }

  async createArticle(input: CreateArticleInput): Promise<ArticleRecord> {
    const result = await this.queryRunner<ArticleRow>(
      `
        INSERT INTO articles (title, content, photo_url)
        VALUES ($1, $2, $3)
        RETURNING id, title, content, photo_url, created_at, updated_at;
      `,
      [input.title, input.content, input.photoUrl ?? null],
    );

    return this.mapRow(result.rows[0]);
  }

  async listArticles(params?: ListArticlesParams): Promise<PaginatedArticlesResult> {
    const page = this.normalizePage(params?.page);
    const pageSize = this.normalizePageSize(params?.pageSize);
    const sortDirection = this.normalizeSortDirection(params?.sortDirection);
    const offset = (page - 1) * pageSize;

    const [itemsResult, totalResult] = await Promise.all([
      this.queryRunner<ArticleRow>(
        `
          SELECT id, title, content, photo_url, created_at, updated_at
          FROM articles
          ORDER BY created_at ${sortDirection}
          LIMIT $1 OFFSET $2;
        `,
        [pageSize, offset],
      ),
      this.queryRunner<{ count: string }>(`
        SELECT COUNT(*)::text AS count
        FROM articles;
      `),
    ]);

    const totalItems = Number.parseInt(totalResult.rows[0]?.count ?? '0', 10);
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

    return {
      data: itemsResult.rows.map((row) => this.mapRow(row)),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
      },
    };
  }

  async getArticleById(id: number): Promise<ArticleRecord | null> {
    const result = await this.queryRunner<ArticleRow>(
      `
        SELECT id, title, content, photo_url, created_at, updated_at
        FROM articles
        WHERE id = $1;
      `,
      [id],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  async updateArticle(id: number, changes: UpdateArticleInput): Promise<ArticleRecord | null> {
    const { assignments, values } = this.buildUpdateStatement(changes);

    if (assignments.length === 0) {
      throw new Error('At least one field must be provided to update an article');
    }

    const idParamIndex = assignments.length + 1;
    const query = `
      UPDATE articles
      SET ${assignments.join(', ')}
      WHERE id = $${idParamIndex}
      RETURNING id, title, content, photo_url, created_at, updated_at;
    `;

    const result = await this.queryRunner<ArticleRow>(query, [...values, id]);

    if (result.rowCount === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  async deleteArticle(id: number): Promise<boolean> {
    const result = await this.queryRunner<{ id: number }>(
      `
        DELETE FROM articles
        WHERE id = $1
        RETURNING id;
      `,
      [id],
    );

    const deletedRows = result.rowCount ?? 0;
    return deletedRows > 0;
  }

  private buildUpdateStatement(input: UpdateArticleInput): {
    assignments: string[];
    values: unknown[];
  } {
    const assignments: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.title !== undefined) {
      assignments.push(`title = $${paramIndex}`);
      values.push(input.title);
      paramIndex += 1;
    }

    if (input.content !== undefined) {
      assignments.push(`content = $${paramIndex}`);
      values.push(input.content);
      paramIndex += 1;
    }

    if (input.photoUrl !== undefined) {
      assignments.push(`photo_url = $${paramIndex}`);
      values.push(input.photoUrl);
      paramIndex += 1;
    }

    return { assignments, values };
  }

  private normalizePage(page?: number): number {
    if (!page || Number.isNaN(page) || page < 1) {
      return 1;
    }
    return Math.floor(page);
  }

  private normalizePageSize(pageSize?: number): number {
    if (!pageSize || Number.isNaN(pageSize)) {
      return DEFAULT_PAGE_SIZE;
    }

    const trimmed = Math.floor(pageSize);
    if (trimmed < 1) {
      return 1;
    }

    return Math.min(trimmed, MAX_PAGE_SIZE);
  }

  private normalizeSortDirection(direction?: ArticleSortDirection): 'ASC' | 'DESC' {
    if (!direction) {
      return 'DESC';
    }

    return direction.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  }

  private mapRow(row: ArticleRow): ArticleRecord {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      photoUrl: row.photo_url,
      createdAt: this.mapDate(row.created_at),
      updatedAt: this.mapDate(row.updated_at),
    };
  }

  private mapDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value);
  }
}

