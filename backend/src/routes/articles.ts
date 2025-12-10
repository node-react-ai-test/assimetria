// src/routes/articles.routes.ts
import { Router, type RequestHandler } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/articlesValidation';
import {
  createArticleSchema,
  updateArticleSchema,
} from '../validation/articleSchemas';

/**
 * Contract for the article controller used by this router.
 * All handlers are standard Express RequestHandlers.
 */
export interface ArticleController {
  list: RequestHandler;
  getById: RequestHandler;
  getByDates: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  delete: RequestHandler;
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
    validateQuery(listArticlesQuerySchema),
    asyncHandler(articleController.list),
  );

  // GET /articles/search?from=YYYY-MM-DD&to=YYYY-MM-DD
  router.get('/search', 
    validateQuery(getArticlesByDatesQuerySchema),
    asyncHandler(articleController.getByDates),
  );

  // GET /articles/:id
  router.get('/:id',
    validateParams(getArticleByIdParamsSchema),
    asyncHandler(articleController.getById),
  );

  // POST /articles
  router.post(
    '/',
    validateBody(createArticleSchema),      // validation middleware
    asyncHandler(articleController.create), // controller
  );

  // PATCH /articles/:id
  router.patch(
    '/:id',
    validateParams(updateArticleParamsSchema),
    validateBody(updateArticleSchema),
    asyncHandler(articleController.update),
  );

  // DELETE /articles/:id
  router.delete('/:id',
    validateParams(deleteArticleParamsSchema),
    asyncHandler(articleController.delete),
  );

  return router;
};
