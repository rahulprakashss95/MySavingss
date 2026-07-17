/**
 * Amounts are held as strings all the way from the text input to the data
 * layer, which converts them to `numeric` on the way into Postgres.
 */

/**
 * True if `value` is a well-formed, positive amount.
 *
 * The obvious check — `!value.trim() || Number(value) <= 0` — has a hole:
 * `Number("1,000")` is `NaN`, and `NaN <= 0` is **false**, so a comma-formatted
 * amount passed validation. It then reached the totals as
 * `Number(amount) || 0`, i.e. it silently counted as zero: a wrong total with
 * no error anywhere. The numeric keyboard makes this unlikely on a phone, but
 * nothing stops it on web.
 *
 * `Number.isFinite` closes that. An empty or blank string needs no separate
 * check — `Number("")` is 0, which is not > 0.
 */
export const isValidAmount = (value: string | undefined | null): boolean => {
  const parsed = Number((value ?? "").trim());
  return Number.isFinite(parsed) && parsed > 0;
};
