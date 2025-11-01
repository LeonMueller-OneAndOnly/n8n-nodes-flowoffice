import { generateUuid } from "../utils/uuid"

export interface StatusLabelDefinition {
	label: string
	enumKey: string
	backgroundColor?: string
}

export interface StatusColumnDefinition {
	boardId: number
	boardName?: string
	columnKey: string
	columnLabel: string
	labels: StatusLabelDefinition[]
}

export interface SwitchClipboardWorkflow {
	nodes: Array<Record<string, unknown>>
	connections: Record<string, { main: unknown[][] }>
	pinData: Record<string, unknown>
	meta: Record<string, unknown>
}

export interface SwitchClipboardBuildResult {
	workflow: SwitchClipboardWorkflow
	json: string
	nodeName: string
	outputCount: number
}

interface BuildItemsOptions {
	statusValueExpression?: string
}

export interface StatusSwitchBuilderItem {
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

export interface BuildSwitchClipboardOptions {
	boardId: number
	boardName?: string
	columnKey: string
	columnLabel: string
	labels: StatusLabelDefinition[]
	statusValueExpression?: string
	nodeName?: string
}

const DEFAULT_STATUS_VALUE_EXPRESSION = "={{ $json.status.to.labelKey }}"

// better, works with all current nodes that output projects:
// {{ $json.cells["Status-status-boardId:0-Status-0e1e0fb5-b3e1-11f0-8e58-d186b1fcf1f7"].cellValue.labelKey }}

export function buildSwitchNodeClipboard(
	options: BuildSwitchClipboardOptions,
): SwitchClipboardBuildResult {
	const {
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
