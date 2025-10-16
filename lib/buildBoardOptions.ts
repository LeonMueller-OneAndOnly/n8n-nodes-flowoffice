import type { INodePropertyOptions } from 'n8n-workflow';
import type { z } from 'zod';
import { ZListBoardsOutput } from './api-schema/board';

export type ListBoardsOutput = z.infer<typeof ZListBoardsOutput>;

export function buildBoardOptions_boardIfField(parsed: ListBoardsOutput): INodePropertyOptions[] {
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
