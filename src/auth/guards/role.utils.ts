import { ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Vérifie si l'utilisateur authentifié possède l'un des rôles autorisés
 * @param context - Le contexte d'exécution NestJS
 * @param allowedRoles - Liste des rôles autorisés (en lowercase)
 * @param errorMessage - Message d'erreur personnalisé
 * @throws ForbiddenException si l'utilisateur n'est pas authentifié ou n'a pas le bon rôle
 * @returns true si l'utilisateur a l'un des rôles autorisés
 */
export function requireRoles(
    context: ExecutionContext,
    allowedRoles: string[],
    errorMessage: string,
): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
        throw new ForbiddenException('User not authenticated');
    }

    const userRole = user.role?.name?.toLowerCase();
    if (!userRole || !allowedRoles.includes(userRole)) {
        throw new ForbiddenException(errorMessage);
    }

    return true;
}
