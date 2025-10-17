import { n8nApi_v1 } from "../transport/api-schema-bundled/api"

import type { INodePropertyOptions } from "n8n-workflow"

import type { z } from "zod"

export type ListBoardsOutput = z.infer<typeof n8nApi_v1.endpoints.board.listBoards.outputSchema>

export function buildOptions_boardId(parsed: ListBoardsOutput): INodePropertyOptions[] {
	const options: INodePropertyOptions[] = []

	for (const topGroup of parsed.boardGroups) {
		for (const item of topGroup.boards) {
			if (item.type === "board") {
				options.push({
					name: `${topGroup.groupName} / ${item.board.name}`,
					value: item.board.boardId,
				})
			} else {
				for (const board of item.boards) {
					options.push({
						name: `${topGroup.groupName} / ${item.groupName} / ${board.name}`,
						value: board.boardId,
					})
				}
			}
		}
	}

	return options
}

export function getBoardById(input: { boards: ListBoardsOutput; boardId: number }) {
	for (const topGroup of input.boards.boardGroups) {
		for (const item of topGroup.boards) {
			if (item.type === "board") {
				if (item.board.boardId === input.boardId) return item.board
			} else {
				const found = item.boards.find((b) => b.boardId === input.boardId)
				if (found) return found
			}
		}
	}
	return undefined
}

export function buildOptions_subboardId(input: {
	boards: ListBoardsOutput
	boardId: number
}): INodePropertyOptions[] {
	const board = getBoardById(input) as unknown as
		| {
				subboards?: unknown
				subBoards?: unknown
		  }
		| undefined

	const subboardsRaw = board && (board.subboards ?? (board as any).subBoards)
	if (!subboardsRaw || !Array.isArray(subboardsRaw)) return []

	const options: INodePropertyOptions[] = []

	for (const sb of subboardsRaw as Array<any>) {
		const idCandidate = sb?.subboardId ?? sb?.subBoardId ?? sb?.boardId ?? sb?.id ?? sb?.value
		const nameCandidate = sb?.name ?? sb?.label ?? String(idCandidate ?? "Subboard")

		if (idCandidate === undefined || idCandidate === null) continue

		options.push({ name: String(nameCandidate), value: idCandidate })
	}

	return options
}

export function buildOptions_columnsForBoard(input: {
	boards: ListBoardsOutput
	boardId: number
}): INodePropertyOptions[] {
	const board = getBoardById(input)
	if (!board) return []
	return board.columnSchema.map((col) => ({
		name: `${col.label} (${col.columnType})`,
		value: col.columnKey,
		description: `Column type: ${col.columnType}`,
	}))
}

export function buildOptions_columnsForBoardFiltered(
	parsed: ListBoardsOutput,
	boardId: number,
	allowedTypes: ReadonlyArray<
		| "name"
		| "text"
		| "number"
		| "date"
		| "checkbox"
		| "interval"
		| "phone"
		| "email"
		| "address"
		| "rating-stars"
		| "erneut-kontaktieren"
		| "link"
		| "personName"
		| "zeitauswertung"
		| "formel"
		| "status"
		| "dokument"
		| "kunde"
		| "teamMember"
		| "aufgaben"
		| "cloud"
		| "lager"
	>,
): INodePropertyOptions[] {
	const board = getBoardById({ boards: parsed, boardId })
	if (!board) return []

	return board.columnSchema
		.filter((col) => allowedTypes.includes(col.columnType as (typeof allowedTypes)[number]))
		.map((col) => ({
			name: `${col.label} (${col.columnType})`,
			value: col.columnKey,
			description: `Column type: ${col.columnType}`,
		}))
}

export function buildOptions_columnsForBoard_statusOnly(
	parsed: ListBoardsOutput,
	boardId: number,
): INodePropertyOptions[] {
	return buildOptions_columnsForBoardFiltered(parsed, boardId, ["status"])
}

export function buildOptions_columnsForBoard_nonStatus(
	parsed: ListBoardsOutput,
	boardId: number,
): INodePropertyOptions[] {
	return buildOptions_columnsForBoardFiltered(parsed, boardId, [
		"name",
		"text",
		"number",
		"date",
		"checkbox",
		"interval",
		"phone",
		"email",
		"address",
		"rating-stars",
		"erneut-kontaktieren",
		"link",
		"personName",
		"zeitauswertung",
		"formel",
		"dokument",
		"kunde",
		"teamMember",
		"aufgaben",
		"cloud",
		"lager",
	])
}
