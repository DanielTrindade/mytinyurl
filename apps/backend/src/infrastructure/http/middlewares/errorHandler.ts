import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '@shared/errors/AppError';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Erros de validação do Zod
  if (error instanceof ZodError) {
    return reply.status(400).send({
      status: 'validation_error',
      message: 'Erro de validação',
      errors: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
    });
  }

  // Erros de validação do Fastify
  if (error.validation) {
    const validationError = error.validation[0];
    let message = 'Erro de validação';

    // Mensagens personalizadas para erros comuns
    if (validationError.keyword === 'format' && validationError.params.format === 'uri') {
      message = 'URL inválida. A URL deve começar com http:// ou https:// e ser um endereço válido';
    }

    return reply.status(400).send({
      status: 'validation_error',
      message,
      errors: [{
        field: validationError.instancePath.replace('/', '') || 'unknown',
        message: message
      }]
    });
  }

  // Erros da aplicação
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      status: 'error',
      message: error.message
    });
  }

  // Log de erros não tratados
  request.log.error(error);

  // Erro interno do servidor
  return reply.status(500).send({
    status: 'error',
    message: 'Erro interno do servidor'
  });
}