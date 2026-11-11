import { SetMetadata } from '@nestjs/common';
import { RoleName } from '../../users/enums/role-name.enum';

export const ROLES_KEY = 'roles';
// Restreint une route aux rôles indiqués
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
