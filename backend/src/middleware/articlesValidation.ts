import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, z } from 'zod';
import { HttpError } from './error';
import { ArticleSortDirection } from '../models/article';

const handleError = (error: unknown, next: NextFunction) => {
    if (error instanceof ZodError) {
        // Send a 400 error with validation details
        next(new HttpError('Validation Error', 400, error.issues));
    } else {
        next(error);
    }
};

// Schemas

export const articleIdSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export type ArticleIdParams = z.infer<typeof articleIdSchema>;

export const listArticlesSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).default(10),
    sortDirection: z.enum(['asc', 'desc']).default('desc').transform((val) => val as ArticleSortDirection),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
}).refine((data) => {
    if (data.from && data.to) {
        return data.from <= data.to;
    }
    return true;
}, {
    message: "The start date must be earlier than or equal to the end date",
    path: ["from"],
});

export type ListArticlesQuery = z.infer<typeof listArticlesSchema>;

export const createArticleSchema = z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    photoUrl: z.string().nullable().optional(),
});

export type CreateArticleBody = z.infer<typeof createArticleSchema>;

export const updateArticleSchema = z.object({
    title: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
    photoUrl: z.string().nullable().optional(),
});

export type UpdateArticleBody = z.infer<typeof updateArticleSchema>;

const systemMessageSchema = z.object({
    role: z.literal('system'),
    content: z.string(),
    name: z.string().optional(),
}).strict();

const userMessageSchema = z.object({
    role: z.literal('user'),
    content: z.string(),
    name: z.string().optional(),
}).strict();

const assistantMessageSchema = z.object({
    role: z.literal('assistant'),
    content: z.string().nullable().optional(),
    name: z.string().optional(),
}).strict();

export const generateArticleSchema = z.object({
    model: z.string().min(1),
    messages: z.array(z.discriminatedUnion('role', [
        systemMessageSchema,
        userMessageSchema,
        assistantMessageSchema,
    ])),
});

export type GenerateArticleBody = z.infer<typeof generateArticleSchema>;

// Middleware

export const validateBody = (schema: ZodSchema) =>
    (req: Request, res: Response, next: NextFunction) => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (error) {
            handleError(error, next);
        }
    };

export const validateQuery = (schema: ZodSchema) =>
    (req: Request<any, any, any, any>, res: Response, next: NextFunction) => {
        try {
            req.query = schema.parse(req.query);
            next();
        } catch (error) {
            handleError(error, next);
        }
    };

export const validateParams = (schema: ZodSchema) =>
    (req: Request<any, any, any, any>, res: Response, next: NextFunction) => {
        try {
            req.params = schema.parse(req.params);
            next();
        } catch (error) {
            handleError(error, next);
        }
    };
