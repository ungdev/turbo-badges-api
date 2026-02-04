import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { requireRoles } from 'src/auth/guards/role.utils';
import { Roles } from 'src/users/user.model';

@Injectable()
export class AgentGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        return requireRoles(
            context,
            [Roles.ADMIN, Roles.AGENT],
            'Only administrators & agents can access this resource',
        );
    }
}