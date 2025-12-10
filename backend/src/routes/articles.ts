// src/routes/user.routes.ts
import { Router, type RequestHandler } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/articlesValidation';
import {
  createArticleSchema,
  updateArticleSchema,
} from '../validation/articleSchemas';

/**
 * Contract for the user controller used by this router.
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

/**
 * Build a router for user-related endpoints.
 *
 * This function is DI-friendly: it does not construct its own controller or services.
 * Everything it needs is passed in via the deps parameter.
 */
export const createArticleRouter = (
  deps: Readonly<CreateArticleRouterDeps>,
): Router => {
  const { articleController } = deps;
  const router = Router();

  // GET /users
  router.get('/', asyncHandler(articleController.list));

  // GET /users/:id
  router.get('/:id', asyncHandler(articleController.getById));

  // POST /users
  router.post(
    '/',
    validateBody(createArticleSchema),      // validation middleware
    asyncHandler(articleController.create), // controller
  );

  // PATCH /users/:id
  router.patch(
    '/:id',
    validateBody(updateArticleSchema),
    asyncHandler(articleController.update),
  );

  // DELETE /users/:id
  router.delete('/:id', asyncHandler(articleController.delete));

  return router;
};
