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

export function buildOptions_columnsForBoardFiltered(
	parsed: ListBoardsOutput,
	boardId: number,
	allowedTypes: ReadonlyArray<
		| 'name'
		| 'text'
		| 'number'
		| 'date'
		| 'checkbox'
		| 'interval'
		| 'phone'
		| 'email'
		| 'address'
		| 'rating-stars'
		| 'erneut-kontaktieren'
		| 'link'
		| 'personName'
		| 'zeitauswertung'
		| 'formel'
		| 'status'
		| 'dokument'
		| 'kunde'
		| 'teamMember'
		| 'aufgaben'
		| 'cloud'
		| 'lager'
	>,
): INodePropertyOptions[] {
	const board = getBoardById(parsed, boardId);
	if (!board) return [];
	return board.columnSchema
		.filter((col) => allowedTypes.includes(col.columnType as (typeof allowedTypes)[number]))
		.map((col) => ({
			name: `${col.label} (${col.columnType})`,
			value: col.columnKey,
			description: `Column type: ${col.columnType}`,
		}));
}

export function buildOptions_columnsForBoard_statusOnly(
	parsed: ListBoardsOutput,
	boardId: number,
): INodePropertyOptions[] {
	return buildOptions_columnsForBoardFiltered(parsed, boardId, ['status']);
}

export function buildOptions_columnsForBoard_nonStatus(
	parsed: ListBoardsOutput,
	boardId: number,
): INodePropertyOptions[] {
	return buildOptions_columnsForBoardFiltered(parsed, boardId, [
		'name',
		'text',
		'number',
		'date',
		'checkbox',
		'interval',
		'phone',
		'email',
		'address',
		'rating-stars',
		'erneut-kontaktieren',
		'link',
		'personName',
		'zeitauswertung',
		'formel',
		'dokument',
		'kunde',
		'teamMember',
		'aufgaben',
		'cloud',
		'lager',
	]);
}
