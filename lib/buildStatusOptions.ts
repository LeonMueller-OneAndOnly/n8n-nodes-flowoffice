import type { INodePropertyOptions } from 'n8n-workflow';
import type { ListBoardsOutput } from './buildBoardOptions';
import { getBoardById } from './buildBoardOptions';
import { helper } from './api-schema-bundled/helper';

export function buildOptions_statusLabels(
	parsed: ListBoardsOutput,
	boardId: number,
	columnKey: string,
): INodePropertyOptions[] {
	const board = getBoardById(parsed, boardId);
	if (!board) return [];
	const column = board.columnSchema.find((c) => c.columnKey === columnKey);
	if (!column || column.columnType !== 'status') return [];

	const { labels } = helper.parseStatus_columnJson({ columnJSON: column.columnJSON ?? '' });
	return labels.map((l) => ({ name: l.label, value: l.enumKey, description: `ID: ${l.enumKey}` }));
}
