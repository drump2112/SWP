import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

// SUPER_ADMIN luôn được phép truy cập tất cả endpoints
const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    // SUPER_ADMIN bypass tất cả role checks
    if (user.roleCode === SUPER_ADMIN_ROLE) {
      return true;
    }
    
    return requiredRoles.some((role) => user.roleCode === role);
  }
}
