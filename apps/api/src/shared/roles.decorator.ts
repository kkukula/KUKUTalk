import { SetMetadata } from '@nestjs/common'

export const ROLES_KEY = 'roles'
export type RoleName = 'CHILD' | 'PARENT' | 'TEACHER' | 'ADMIN'
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles)
