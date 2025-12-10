import { QueryResult, QueryResultRow } from 'pg';

import { runQuery } from '../db';
import {
  Article,
  ArticleSortDirection,
  CreateArticleInput,
  UpdateArticleInput,
  ListArticlesParams,
  GetArticlesByDatesParams,
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



export interface PaginatedArticlesResult {
  data: Article[];
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

  async createArticle(input: CreateArticleInput): Promise<Article> {
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

  async listArticles(params: ListArticlesParams): Promise<PaginatedArticlesResult> {
    const page = params.page;
    const pageSize = params.pageSize;
    const sortDirection = params.sortDirection;
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

  async listArticlesByDateRange(
    params: GetArticlesByDatesParams,
  ): Promise<PaginatedArticlesResult> {
    if (!params) {
      throw new Error('Date range parameters are required');
    }

    const fromDate = params.from;
    const toDate = params.to;



    const page = params.page;
    const pageSize = params.pageSize;
    const sortDirection = params.sortDirection;
    const offset = (page - 1) * pageSize;

    const [itemsResult, totalResult] = await Promise.all([
      this.queryRunner<ArticleRow>(
        `
          SELECT id, title, content, photo_url, created_at, updated_at
          FROM articles
          WHERE created_at >= $3 AND created_at <= $4
          ORDER BY created_at ${sortDirection}
          LIMIT $1 OFFSET $2;
        `,
        [pageSize, offset, fromDate, toDate],
      ),
      this.queryRunner<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM articles
          WHERE created_at >= $1 AND created_at <= $2;
        `,
        [fromDate, toDate],
      ),
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

  async getArticleById(id: number): Promise<Article | null> {
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

  async updateArticle(id: number, changes: UpdateArticleInput): Promise<Article | null> {
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

  private mapRow(row: ArticleRow): Article {
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

