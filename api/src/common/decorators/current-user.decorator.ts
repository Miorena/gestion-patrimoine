import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: number; // user id
  email: string;
  role: string;
}

// Injects the authenticated user (JWT payload) into a controller method
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload =>
    context.switchToHttp().getRequest().user,
);
