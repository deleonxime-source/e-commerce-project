function toArr(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    return value
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [String(value)];
}

export function roleListFromIdToken(token) {
  if (!token || typeof token !== 'object') return [];
  return [
    ...new Set([
      ...toArr(token.groups),
      ...toArr(token.roles),
      ...toArr(token['http://wso2.org/claims/groups']),
    ]),
  ];
}

export function isAdminFromIdToken(token) {
  return roleListFromIdToken(token).includes('admin');
}
