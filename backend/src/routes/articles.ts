// src/routes/articles.routes.ts
import { Router } from 'express';
import { asyncHandler, type AsyncHandler } from '../middleware/asyncHandler';
import {
  validateBody,
  validateParams,
  validateQuery,
  articleIdSchema,
  createArticleSchema,
  listArticlesSchema,
  updateArticleSchema,
  type ArticleIdParams,
  type CreateArticleBody,
  type ListArticlesQuery,
  type UpdateArticleBody,
} from '../middleware/articlesValidation';

/**
 * Contract for the article controller used by this router.
 * All handlers are standard Express RequestHandlers.
 */
export interface ArticleController {
  list: AsyncHandler<unknown, unknown, unknown, ListArticlesQuery>;
  getById: AsyncHandler<ArticleIdParams>;
  getByDates: AsyncHandler<unknown, unknown, unknown, ListArticlesQuery>;
  create: AsyncHandler<unknown, unknown, CreateArticleBody>;
  update: AsyncHandler<ArticleIdParams, unknown, UpdateArticleBody>;
  delete: AsyncHandler<ArticleIdParams>;
}

export interface CreateArticleRouterDeps {
  articleController: ArticleController;
}

/**
 * Build a router for article-related endpoints.
 *
 * This function is DI-friendly: it does not construct its own controller or services.
 * Everything it needs is passed in via the deps parameter.
 */
export const createArticleRouter = (
  deps: Readonly<CreateArticleRouterDeps>,
): Router => {
  const { articleController } = deps;
  const router = Router();

  // GET /articles
  router.get('/',
    validateQuery(listArticlesSchema),
    asyncHandler(articleController.list),
  );

  // GET /articles/search?from=YYYY-MM-DD&to=YYYY-MM-DD
  router.get('/search',
    validateQuery(listArticlesSchema),
    asyncHandler(articleController.getByDates),
  );

  // GET /articles/:id
  router.get<ArticleIdParams>('/:id',
    validateParams(articleIdSchema),
    asyncHandler(articleController.getById),
  );

  // POST /articles
  router.post(
    '/',
    validateBody(createArticleSchema),      // validation middleware
    asyncHandler(articleController.create), // controller
  );

  // PATCH /articles/:id
  router.patch<ArticleIdParams, unknown, UpdateArticleBody>(
    '/:id',
    validateParams(articleIdSchema),
    validateBody(updateArticleSchema),
    asyncHandler(articleController.update),
  );

  // DELETE /articles/:id
  router.delete<ArticleIdParams>('/:id',
    validateParams(articleIdSchema),
    asyncHandler(articleController.delete),
  );

  return router;
};
