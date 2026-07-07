export const resolveMuiIcon = (iconModule) => {
  let candidate = iconModule;

  while (
    candidate &&
    typeof candidate === 'object' &&
    !candidate.$$typeof &&
    Object.prototype.hasOwnProperty.call(candidate, 'default')
  ) {
    candidate = candidate.default;
  }

  return candidate;
};
