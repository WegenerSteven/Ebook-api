import { createParamDecorator, ExecutionContext } from '@nestjs/common';
interface RequestWithUser {
  id: string;
  email: string;
  role: string;
}
// Usage: @GetUser() user, @GetUser('email') email
export const CurrentUser = createParamDecorator(
  (data: keyof RequestWithUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestWithUser }>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
