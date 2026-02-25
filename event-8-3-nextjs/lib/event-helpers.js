export function hashCode(input = '') {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getLetterSizeClass(content = '', code = 0) {
  const len = content.trim().length;
  if (len >= 220) return code % 2 === 0 ? 'letter-size-xl' : 'letter-size-lg';
  if (len >= 140) return 'letter-size-lg';
  if (len >= 80) return code % 3 === 0 ? 'letter-size-md-wide' : 'letter-size-md';
  return code % 4 === 0 ? 'letter-size-sm-wide' : 'letter-size-sm';
}

export function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}
