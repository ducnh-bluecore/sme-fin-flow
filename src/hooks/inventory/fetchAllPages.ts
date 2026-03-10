/**
 * Generic paginated fetcher for Supabase queries that exceed the 1000-row default limit.
 * Fetches all pages by iterating with .range() until fewer rows than PAGE_SIZE are returned.
 */
export async function fetchAllPages<T = any>(
  buildQuery: () => any,
  pageSize = 1000
): Promise<T[]> {
  let allData: T[] = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await buildQuery()
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const rows = (data || []) as T[];
    allData = allData.concat(rows);
    hasMore = rows.length === pageSize;
    offset += pageSize;
  }
  return allData;
}
