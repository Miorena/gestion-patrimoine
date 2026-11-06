import { SetMetadata } from '@nestjs/common';
import { RoleName } from '../enums/role.enum';

export const ROLES_KEY = 'roles';
// Restricts a route to the given roles
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
