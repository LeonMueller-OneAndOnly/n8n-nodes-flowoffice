import superjson from 'superjson';
import { z } from 'zod';

export const ZStatusColumnOptions = z.array(
	z.object({
		label: z.string(),
		backgroundColor: z.string(),
		enumKey: z.string(),
	}),
);

export function parseStatus_columnJson(column: { columnJSON: string }) {
	const labels = ZStatusColumnOptions.parse(superjson.parse(column.columnJSON ?? ''));
	return { labels };
}
