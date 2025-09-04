import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { Request, Response } from 'express'

type ProblemDetails = {
  type: string
  title: string
  status: number
  detail?: string | string[]
  instance: string
  timestamp: string
  traceId?: string
  errors?: Record<string, string[]>
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse<Response>()
    const req = ctx.getRequest<Request>()

    const isHttp = exception instanceof HttpException
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR

    let title = isHttp ? exception.name : 'Internal Server Error'
    let detail: string | string[] | undefined
    let type = isHttp
      ? `https://httpstatuses.com/${status}`
      : 'about:blank'
    let errors: Record<string, string[]> | undefined

    if (isHttp) {
      const resp = exception.getResponse() as any
      // Nest/validation pipe typically returns: { statusCode, message, error }
      if (resp?.message && Array.isArray(resp.message)) {
        // class-validator messages
        detail = 'Validation failed'
        errors = this.normalizeValidation(resp.message)
        title = resp.error || 'Bad Request'
        type = 'https://docs.kukutalk/validation-error'
      } else if (typeof resp === 'object') {
        detail = resp?.message ?? exception.message
        title = resp?.error ?? title
      } else if (typeof resp === 'string') {
        detail = resp
      } else {
        detail = exception.message
      }
    } else if (exception && typeof exception === 'object') {
      // Non-HTTP exception (programmer error or unknown)
      // @ts-ignore
      detail = exception?.message ?? 'Unexpected error'
    }

    const problem: ProblemDetails = {
      type,
      title,
      status,
      detail,
      instance: req.originalUrl,
      timestamp: new Date().toISOString(),
      traceId: req.headers['x-request-id'] as string | undefined,
      ...(errors ? { errors } : {}),
    }

    res
      .status(status)
      .header('Content-Type', 'application/problem+json')
      .json(problem)
  }

  private normalizeValidation(messages: string[]): Record<string, string[]> {
    // messages may look like: "username must be a string", "password should not be empty"
    // We group by field name (first token until space) heuristically.
    const result: Record<string, string[]> = {}
    for (const msg of messages) {
      const field = msg.split(' ')[0] || 'general'
      if (!result[field]) result[field] = []
      result[field].push(msg)
    }
    return result
  }
}
