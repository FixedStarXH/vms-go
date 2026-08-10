export const queryKeys = {
  system: {
    allRoles: ['system', 'roles', 'all'] as const,
    users: (params?: Record<string, any>) => ['system', 'users', params] as const,
    roles: (params?: Record<string, any>) => ['system', 'roles', params] as const,
    menus: ['system', 'menus'] as const,
    depts: ['system', 'depts'] as const,
    dictItems: (dictType: string) => ['system', 'dict', dictType] as const,
  },
} as const
