import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { requireRoles } from 'src/auth/guards/role.utils';
import { Roles } from 'src/users/user.model';

@Injectable()
export class AdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        return requireRoles(
            context,
            [Roles.ADMIN],
            'Only administrators can access this resource',
        );
    }
}