import { getBoardById } from "../build-options/buildBoardOptions"
import { invokeEndpoint, NodeExecutionContext } from "../transport/invoke-api"
import { helper } from "../transport/api-schema-bundled/helper"
import { n8nApi_v1 } from "../transport/api-schema-bundled/api"
import { generateUuid } from "../utils/uuid"

export type {
	StatusColumnDefinition,
	StatusLabelDefinition,
	SwitchClipboardBuildResult,
	SwitchClipboardWorkflow,
	BuildSwitchClipboardOptions,
	StatusSwitchBuilderItem,
}

interface StatusLabelDefinition {
	label: string
	enumKey: string
	backgroundColor?: string
}

interface StatusColumnDefinition {
	boardId: number
	boardName?: string
	columnKey: string
	columnLabel: string
	labels: StatusLabelDefinition[]
}

interface SwitchClipboardWorkflow {
	nodes: Array<Record<string, unknown>>
	connections: Record<string, { main: unknown[][] }>
	pinData: Record<string, unknown>
	meta: Record<string, unknown>
}

interface SwitchClipboardBuildResult {
	workflow: SwitchClipboardWorkflow
	json: string
	nodeName: string
	outputCount: number
}

interface BuildItemsOptions {
	statusValueExpression?: string
}

interface StatusSwitchBuilderItem {
	boardId: number
	boardName?: string
	columnKey: string
	columnLabel: string
	labels: StatusLabelDefinition[]
	switchNodeJson: string
	switchNodeWorkflow: SwitchClipboardWorkflow
	nodeName: string
	outputCount: number
}

interface BuildSwitchClipboardOptions {
	boardId: number
	boardName?: string
	columnKey: string
	columnLabel: string
	labels: StatusLabelDefinition[]
	statusValueExpression?: string
	nodeName?: string
}

const DEFAULT_STATUS_VALUE_EXPRESSION = "={{ $json.status.to.labelKey }}"

export async function fetchStatusColumnsForBoard(params: {
	thisArg: NodeExecutionContext
	boardId: number
}): Promise<StatusColumnDefinition[]> {
	const { thisArg, boardId } = params

	const boardsResponse = await invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
		thisArg,
		body: null,
	})

	const board = getBoardById({ boards: boardsResponse, boardId })
	if (!board) {
		return []
	}

	return board.columnSchema
		.filter((column) => !column.deactivated)
		.filter((column) => column.columnType === "status")
		.map((column) => {
			const { labels } = helper.parseStatus_columnJson({ columnJSON: column.columnJSON ?? "" })

			return {
				boardId,
				boardName: board.name,
				columnKey: column.columnKey,
				columnLabel: column.label,
				labels,
			}
		})
}

export function buildSwitchNodeClipboard(
	options: BuildSwitchClipboardOptions,
): SwitchClipboardBuildResult {
	const {
		// boardId,
		// boardName,
		// columnKey,
		columnLabel,
		labels,
		statusValueExpression = DEFAULT_STATUS_VALUE_EXPRESSION,
		nodeName: nodeNameFromOptions,
	} = options

	const safeLabels = labels.filter(
		(label) => label.enumKey !== undefined && label.label !== undefined,
	)

	const nodeName = nodeNameFromOptions ?? buildDefaultNodeName({ columnLabel })
	const nodeId = createN8nIdentifier()
	const rules = safeLabels.map((label) =>
		buildRuleForLabel({
			label,
			statusValueExpression,
		}),
	)

	const workflow = buildWorkflow({ nodeId, nodeName, rules })
	const json = JSON.stringify(workflow, null, 2)

	return {
		workflow,
		json,
		nodeName,
		outputCount: rules.length,
	}
}

export function buildSwitchBuilderItems(
	columns: StatusColumnDefinition[],
	options?: BuildItemsOptions,
): StatusSwitchBuilderItem[] {
	return columns.map((column) => {
		const { workflow, json, nodeName, outputCount } = buildSwitchNodeClipboard({
			boardId: column.boardId,
			boardName: column.boardName,
			columnKey: column.columnKey,
			columnLabel: column.columnLabel,
			labels: column.labels,
			statusValueExpression: options?.statusValueExpression,
		})

		return {
			boardId: column.boardId,
			boardName: column.boardName,
			columnKey: column.columnKey,
			columnLabel: column.columnLabel,
			labels: column.labels,
			switchNodeJson: json,
			switchNodeWorkflow: workflow,
			nodeName,
			outputCount,
		}
	})
}

function buildDefaultNodeName(input: { columnLabel: string }): string {
	return `Switch Status: ${input.columnLabel}`
}

function buildRuleForLabel(params: {
	label: StatusLabelDefinition
	statusValueExpression: string
}) {
	const { label, statusValueExpression } = params

	return {
		conditions: {
			options: {
				caseSensitive: true,
				leftValue: "",
				typeValidation: "strict",
				version: 2,
			},
			conditions: [
				{
					id: createN8nIdentifier(),
					leftValue: statusValueExpression,
					rightValue: buildRightValue(label.enumKey),
					operator: {
						type: "string",
						operation: "equals",
					},
				},
			],
			combinator: "and",
		},
		renameOutput: true,
		outputKey: label.label,
	}
}

function buildRightValue(enumKey: string): string {
	return `={{ "${enumKey}" }}`
}

function buildWorkflow(params: {
	nodeId: string
	nodeName: string
	rules: Array<ReturnType<typeof buildRuleForLabel>>
}): SwitchClipboardWorkflow {
	const { nodeId, nodeName, rules } = params

	const node = {
		parameters: {
			rules: {
				values: rules,
			},
			options: {},
		},
		type: "n8n-nodes-base.switch",
		typeVersion: 3.3,
		position: [0, 0],
		id: nodeId,
		name: nodeName,
	}

	return {
		nodes: [node],
		connections: {
			[nodeName]: {
				main: createEmptyConnections(rules.length),
			},
		},
		pinData: {},
		meta: {
			templateCredsSetupCompleted: true,
			instanceId: createInstanceIdentifier(),
		},
	}
}

function createEmptyConnections(outputCount: number): unknown[][] {
	return Array.from({ length: Math.max(outputCount, 1) }, () => [])
}

function createN8nIdentifier(): string {
	return generateUuid()
}

function createInstanceIdentifier(): string {
	return generateUuid().replace(/-/g, "")
}
