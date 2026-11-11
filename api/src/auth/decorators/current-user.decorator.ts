import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '../types/jwt-payload.interface';

// Injecte l'utilisateur authentifié (payload JWT) dans une méthode de contrôleur
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload =>
    context.switchToHttp().getRequest().user,
);
