import {
  Article,
  CreateArticleInput,
  GetArticlesByDatesParams,
  ListArticlesParams,
  UpdateArticleInput,
} from '../models/article';
import {
  ArticleRepository,
  PaginatedArticlesResult,
} from '../repositories/articlesRepository';
import {
  AiGenerateArticleRepository,
  GenerateArticleParams,
} from '../repositories/aiGenerateArticleRepository';

export class ArticleServiceDependencyError extends Error {
  constructor(dependencyName: string) {
    super(`Missing ArticleService dependency: ${dependencyName}`);
    this.name = 'ArticleServiceDependencyError';
  }
}

export class ArticleNotFoundError extends Error {
  public readonly articleId: number;

  constructor(articleId: number) {
    super(`Article ${articleId} was not found`);
    this.name = 'ArticleNotFoundError';
    this.articleId = articleId;
  }
}

export class InvalidDateRangeError extends Error {
  public readonly from: Date;
  public readonly to: Date;

  constructor(from: Date, to: Date) {
    super('The start date must be earlier than or equal to the end date');
    this.name = 'InvalidDateRangeError';
    this.from = from;
    this.to = to;
  }
}

export interface ArticleServiceDependencies {
  articleRepository: ArticleRepository;
  aiGenerateArticleRepository: AiGenerateArticleRepository;
}

export interface ArticleServiceContract {
  listArticles(params: ListArticlesParams): Promise<PaginatedArticlesResult>;
  listArticlesByDateRange(
    params: GetArticlesByDatesParams,
  ): Promise<PaginatedArticlesResult>;
  getArticleById(id: number): Promise<Article>;
  createArticle(input: CreateArticleInput): Promise<Article>;
  updateArticle(id: number, changes: UpdateArticleInput): Promise<Article>;
  deleteArticle(id: number): Promise<void>;
  generateArticle(params: GenerateArticleParams): Promise<Article>;
}

export class ArticleService implements ArticleServiceContract {
  private readonly articleRepository: ArticleRepository;
  private readonly aiGenerateArticleRepository: AiGenerateArticleRepository;

  constructor(dependencies: ArticleServiceDependencies) {
    if (!dependencies?.articleRepository) {
      throw new ArticleServiceDependencyError('articleRepository');
    }

    if (!dependencies?.aiGenerateArticleRepository) {
      throw new ArticleServiceDependencyError('aiGenerateArticleRepository');
    }

    this.articleRepository = dependencies.articleRepository;
    this.aiGenerateArticleRepository = dependencies.aiGenerateArticleRepository;
  }

  async listArticles(params: ListArticlesParams): Promise<PaginatedArticlesResult> {
    return this.articleRepository.listArticles(params);
  }

  async listArticlesByDateRange(
    params: GetArticlesByDatesParams,
  ): Promise<PaginatedArticlesResult> {
    this.ensureValidDateRange(params.from, params.to);
    return this.articleRepository.listArticlesByDateRange(params);
  }

  async getArticleById(id: number): Promise<Article> {
    const article = await this.articleRepository.getArticleById(id);

    if (!article) {
      throw new ArticleNotFoundError(id);
    }

    return article;
  }

  async createArticle(input: CreateArticleInput): Promise<Article> {
    return this.articleRepository.createArticle(input);
  }

  async updateArticle(id: number, changes: UpdateArticleInput): Promise<Article> {
    const updatedArticle = await this.articleRepository.updateArticle(id, changes);

    if (!updatedArticle) {
      throw new ArticleNotFoundError(id);
    }

    return updatedArticle;
  }

  async deleteArticle(id: number): Promise<void> {
    const deleted = await this.articleRepository.deleteArticle(id);

    if (!deleted) {
      throw new ArticleNotFoundError(id);
    }
  }

  async generateArticle(params: GenerateArticleParams): Promise<Article> {
    const generatedArticleInput =
      await this.aiGenerateArticleRepository.generateArticle(params);

    return this.articleRepository.createArticle(generatedArticleInput);
  }

  private ensureValidDateRange(from: Date, to: Date): void {
    if (from.getTime() > to.getTime()) {
      throw new InvalidDateRangeError(from, to);
    }
  }
}
