import type { INodePropertyOptions } from 'n8n-workflow';
import type { z } from 'zod';
import { ZListBoardsOutput } from './api-schema/board';

export type ListBoardsOutput = z.infer<typeof ZListBoardsOutput>;

export function buildOptions_boardId(parsed: ListBoardsOutput): INodePropertyOptions[] {
	const options: INodePropertyOptions[] = [];

	for (const topGroup of parsed.boardGroups) {
		for (const item of topGroup.boards) {
			if (item.type === 'board') {
				options.push({
					name: `${topGroup.groupName} / ${item.board.name}`,
					value: item.board.boardId,
				});
			} else {
				for (const board of item.boards) {
					options.push({
						name: `${topGroup.groupName} / ${item.groupName} / ${board.name}`,
						value: board.boardId,
					});
				}
			}
		}
	}

	return options;
}

export function getBoardById(parsed: ListBoardsOutput, boardId: number) {
	for (const topGroup of parsed.boardGroups) {
		for (const item of topGroup.boards) {
			if (item.type === 'board') {
				if (item.board.boardId === boardId) return item.board;
			} else {
				const found = item.boards.find((b) => b.boardId === boardId);
				if (found) return found;
			}
		}
	}
	return undefined;
}

export function buildOptions_columnsForBoard(
	parsed: ListBoardsOutput,
	boardId: number,
): INodePropertyOptions[] {
	const board = getBoardById(parsed, boardId);
	if (!board) return [];
	return board.columnSchema.map((col) => ({
		name: `${col.label} (${col.columnType})`,
		value: col.columnKey,
		description: `Column type: ${col.columnType}`,
	}));
}
