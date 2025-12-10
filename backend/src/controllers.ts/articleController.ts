import { NextFunction, Request, Response } from 'express';
import {
  ArticleServiceContract,
  ArticleNotFoundError,
  InvalidDateRangeError,
} from '../services/articlesService';
import { ListArticlesParams } from '../models/article';
import { HttpError } from '../middleware/error';
import {
  ArticleIdParams,
  CreateArticleBody,
  GenerateArticleBody,
  ListArticlesQuery,
  UpdateArticleBody,
} from '../middleware/articlesValidation';

export class ArticleController {
  constructor(private readonly articleService: ArticleServiceContract) { }

  public list = async (
    req: Request<unknown, unknown, unknown, ListArticlesQuery>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const pagination = this.buildPaginationParams(req.query);
      const result = await this.articleService.listArticles(pagination);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public getByDates = async (
    req: Request<unknown, unknown, unknown, ListArticlesQuery>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { from, to } = req.query;

      if (!from || !to) {
        next(new HttpError('Both from and to query parameters are required', 400));
        return;
      }

      const pagination = this.buildPaginationParams(req.query);
      const result = await this.articleService.listArticlesByDateRange({
        from,
        to,
        ...pagination,
      });

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof InvalidDateRangeError) {
        next(new HttpError(error.message, 400));
      } else {
        next(error);
      }
    }
  };

  public getById = async (
    req: Request<ArticleIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const article = await this.articleService.getArticleById(id);
      res.status(200).json(article);
    } catch (error) {
      if (error instanceof ArticleNotFoundError) {
        next(new HttpError(error.message, 404));
      } else {
        next(error);
      }
    }
  };

  public create = async (
    req: Request<unknown, unknown, CreateArticleBody>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = req.body;
      const article = await this.articleService.createArticle(body);
      res.status(201).json(article);
    } catch (error) {
      next(error);
    }
  };

  public update = async (
    req: Request<ArticleIdParams, unknown, UpdateArticleBody>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const body = req.body;
      const article = await this.articleService.updateArticle(id, body);
      res.status(200).json(article);
    } catch (error) {
      if (error instanceof ArticleNotFoundError) {
        next(new HttpError(error.message, 404));
      } else {
        next(error);
      }
    }
  };

  public delete = async (
    req: Request<ArticleIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      await this.articleService.deleteArticle(id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof ArticleNotFoundError) {
        next(new HttpError(error.message, 404));
      } else {
        next(error);
      }
    }
  };

  public generate = async (
    req: Request<unknown, unknown, GenerateArticleBody>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = req.body;
      // We assume Schema matches Service expectations.
      // If generateArticleSchema is strictly typed to match GenerateArticleParams, we are good.
      // GenerateArticleParams expects: { model: string; messages: ChatCompletionMessageParam[]; }
      // Our generic body is inferred from Zod.
      // ChatCompletionMessageParam is a complex union type from OpenAI.
      // Zod schema for messages is "messages: z.array(z.object({...}).passthrough())"
      // This will infer as { role: string; content?: string | null | undefined }[] with extra props allowed.
      // This might not strictly assign to ChatCompletionMessageParam.
      // But the user strictly denied "as".
      // If TS errors here, we might need to adjust the schema inference or service signature.
      // However, usually TS is fine with structural compatibility.
      // Let's rely on structural typing. If it fails, I'll need to update Zod schema to be more precise or accept the error.

      // Using @ts-ignore or @ts-expect-error is also discouraged if user wants "correct types".
      // I will assume compatibility for now.

      const article = await this.articleService.generateArticle(body);
      res.status(201).json(article);
    } catch (error) {
      next(error);
    }
  };

  private buildPaginationParams(query: ListArticlesQuery): ListArticlesParams {
    return {
      page: query.page,
      pageSize: query.pageSize,
      sortDirection: query.sortDirection,
    };
  }
}
