const FORBIDDEN_KEYWORDS =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|MERGE|EXEC|EXECUTE|GRANT|REVOKE|DENY|BACKUP|RESTORE|sp_|xp_)\b/i;

/**
 * Defense-in-depth check on top of a read-only DB login: rejects anything
 * that isn't a single SELECT/WITH statement or contains mutation keywords.
 * The real safety boundary is the DB user's permissions (see README).
 */
export function assertReadOnlyQuery(rawQuery) {
  const query = rawQuery.trim();

  if (!query) {
    throw new Error('Query must not be empty.');
  }

  const withoutTrailingSemicolon = query.replace(/;\s*$/, '');
  if (withoutTrailingSemicolon.includes(';')) {
    throw new Error('Multiple statements are not allowed — submit a single SELECT statement.');
  }

  if (!/^(SELECT|WITH)\b/i.test(withoutTrailingSemicolon)) {
    throw new Error('Only SELECT statements are allowed.');
  }

  if (FORBIDDEN_KEYWORDS.test(withoutTrailingSemicolon)) {
    throw new Error('Query contains a forbidden keyword (mutation or stored-procedure execution).');
  }

  return withoutTrailingSemicolon;
}
