import type {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
	IWebhookResponseData,
} from "n8n-workflow"
import { NodeConnectionTypes, NodeOperationError } from "n8n-workflow"

import { invokeEndpoint } from "../../src/transport/invoke-api"
import { n8nApi_v1 } from "../../src/transport/api-schema-bundled/api"
import { helper } from "../../src/transport/api-schema-bundled/helper"

import {
	buildOptions_boardId,
	buildOptions_subboardId,
	buildOptions_columnsForBoard_statusOnly,
	getBoardById,
} from "../../src/build-options/buildBoardOptions"

import z from "zod"

const EmptyStatusColumnName = "(no status column selected)"

export class FlowOfficeTriggerOnProjectStatusChange implements INodeType {
	description: INodeTypeDescription = {
		version: 1,
		name: "flowOfficeTriggerOnProjectStatusChange",
		icon: {
			light: "file:FlowOfficeTriggerOnProjectStatusChange.svg",
			dark: "file:FlowOfficeTriggerOnProjectStatusChange.dark.svg",
		},
		group: ["trigger"],
		displayName: "Trigger on Project Status Change (FlowOffice)",
		description: "Trigger on project status change event",
		subtitle: undefined, // "={{$parameter.boardId}}",
		defaults: {
			name: "Trigger on Project Status Change (FlowOffice)",
		},

		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: undefined,

		credentials: [
			{
				name: "flowOfficeApi",
				required: true,
			},
		],
		webhooks: [
			{
				name: "default",
				httpMethod: "POST",
				responseMode: "onReceived",
				path: "webhook",
			},
		],

		// ------------------------------

		properties: [
			{
				displayName: "Board Name or ID",
				placeholder: "Select a board",
				name: "boardId",
				type: "options",
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: "",
				required: true,
				typeOptions: {
					loadOptionsMethod: "listBoards",
				},
				hint: "The cells of the projekte returned here can vary depending on the board. You can use the 'List columns of a board' node to get the columns of the board and see what is available.",
			},

			{
				displayName: "Status Column Name or ID",
				name: "statusColumnKey",
				type: "options",
				default: "",
				description:
					'Select a status column to filter by, then choose its labels below. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',

				required: true,
				displayOptions: {
					hide: {
						boardId: [""],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ["boardId"],
					loadOptionsMethod: "listStatusColumns",
				},
				hint: "Select the status column to watch. The FROM/TO label filters below are optional — leave them empty to match ANY.",
			},

			{
				displayName: "When FROM Status Is In",
				name: "fromStatusLabels",
				type: "multiOptions",
				default: [],
				options: [],
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				placeholder: "Leave empty for ANY from-status",
				hint: "Optional. Trigger when the previous (FROM) status matches any selected label. Leave empty to match ANY from-status. The node triggers if either FROM or TO filters match.",
				displayOptions: {
					hide: {
						boardId: [""],
						statusColumnKey: ["", EmptyStatusColumnName],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ["boardId", "statusColumnKey"],
					loadOptionsMethod: "listStatusLabels",
				},
			},

			{
				displayName: "When TO Status Is In",
				name: "toStatusLabels",
				type: "multiOptions",
				default: [],
				options: [],
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				placeholder: "Leave empty for ANY to-status",
				hint: "Optional. Trigger when the new (TO) status matches any selected label. Leave empty to match ANY to-status. The node triggers if either FROM or TO filters match.",
				displayOptions: {
					hide: {
						boardId: [""],
						statusColumnKey: ["", EmptyStatusColumnName],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ["boardId", "statusColumnKey"],
					loadOptionsMethod: "listStatusLabels",
				},
			},
		],
	}

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData("node") as unknown as Partial<TWebhookData>

				const webhookUrl = this.getNodeWebhookUrl("default") as string
				const boardId = this.getNodeParameter("boardId") as string
				const statusColumnKey = this.getNodeParameter("statusColumnKey") as string
				const fromStatusLabels = (this.getNodeParameter("fromStatusLabels") as string[]) || []
				const toStatusLabels = (this.getNodeParameter("toStatusLabels") as string[]) || []

				const currentConfigHash = buildConfigHash({
					webhookUrl,
					boardId,
					statusColumnKey,
					fromStatusLabels,
					toStatusLabels,
				})

				if (
					!staticData ||
					staticData.webhookId === undefined ||
					staticData.clientSubscriptionId === undefined
				) {
					return false
				}

				if (staticData.configHash !== currentConfigHash) {
					return false
				}

				return true
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl("default") as string

				if (webhookUrl.includes("//localhost")) {
					throw new NodeOperationError(
						this.getNode(),
						'The Webhook can not work on "localhost". Please, either setup n8n on a custom domain or start with "--tunnel"!',
					)
				}

				const boardId = this.getNodeParameter("boardId") as string
				const statusColumnKey = this.getNodeParameter("statusColumnKey") as string
				const fromStatusLabels = (this.getNodeParameter("fromStatusLabels") as string[]) || []
				const toStatusLabels = (this.getNodeParameter("toStatusLabels") as string[]) || []

				const staticData = this.getWorkflowStaticData("node") as unknown as Partial<TWebhookData>
				const clientSubscriptionId =
					staticData?.clientSubscriptionId ?? generateClientSubscriptionId({ this: this })
				const signingSecret = staticData?.signingSecret ?? generateSigningSecret()

				const configHash = buildConfigHash({
					webhookUrl,
					boardId,
					statusColumnKey,
					fromStatusLabels,
					toStatusLabels,
				})

				const upsertBody = {
					clientSubscriptionId,
					targetUrl: webhookUrl,
					filters: {
						boardId: Number(boardId),
						statusColumnKey,
						fromStatusLabels: [...fromStatusLabels],
						toStatusLabels: [...toStatusLabels],
					},
					signingSecret,
				}

				// Placeholder local schema (assume bundled api will replace this)
				const upsertSchema = {
					method: "PUT" as const,
					pathname: `/api/v1/webhooks/subscriptions/${encodeURIComponent(clientSubscriptionId)}`,
					inputSchema: z.object({
						targetUrl: z.string(),
						filters: z.object({
							boardId: z.number().int(),
							statusColumnKey: z.string(),
							fromStatusLabels: z.array(z.string()),
							toStatusLabels: z.array(z.string()),
						}),
						signingSecret: z.string().optional(),
					}),
					outputSchema: z
						.object({
							webhookId: z.number().int(),
							signingSecret: z.string().optional(),
						})
						.passthrough(),
				}
				const apiResponse = await invokeEndpoint(upsertSchema, {
					thisArg: this as unknown as ILoadOptionsFunctions,
					body: {
						targetUrl: upsertBody.targetUrl,
						filters: upsertBody.filters,
						signingSecret: upsertBody.signingSecret,
					},
				})

				const webhookId = (apiResponse && (apiResponse.webhookId as number)) ?? undefined
				const effectiveSigningSecret = apiResponse?.signingSecret ?? signingSecret

				setWebhookData_inWorkflowStaticData({
					this: this,
					webhookData: {
						webhookId: webhookId as number,
						clientSubscriptionId,
						signingSecret: effectiveSigningSecret,
						configHash,
					},
				})

				return true
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const saved = getWebhookData_fromWorkflowStaticData({ this: this })
				if (!saved) {
					return true
				}

				try {
					const deleteSchema = {
						method: "DELETE" as const,
						pathname: `/api/v1/webhooks/subscriptions/${encodeURIComponent(saved.clientSubscriptionId)}`,
						inputSchema: z.null(),
						outputSchema: z.object({}).passthrough(),
					}
					await invokeEndpoint(deleteSchema, {
						thisArg: this as unknown as ILoadOptionsFunctions,
						body: null,
					})
				} catch {
					// Treat 404 as success (idempotent delete). Actual error handling will depend on invokeEndpoint behavior.
				}
				return true
			},
		},
	}

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData()
		if (bodyData.hook_id !== undefined && bodyData.action === undefined) {
			return {
				webhookResponse: "OK",
			}
		}

		const returnData: IDataObject[] = []

		returnData.push({
			body: bodyData,
		})

		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		}
	}

	methods = {
		loadOptions: {
			async listBoards(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
					thisArg: this,
					body: null,
				}).then(buildOptions_boardId)
			},

			async listSubboards(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedBoardId = this.getCurrentNodeParameter("boardId")
				if (!selectedBoardId) return []

				const boards = await invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
					thisArg: this,
					body: null,
				})

				const boardId = Number(selectedBoardId)
				return buildOptions_subboardId({ boards, boardId })
			},

			async listStatusColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedBoardId = this.getCurrentNodeParameter("boardId")

				if (!selectedBoardId) return []

				const boards = await invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
					thisArg: this,
					body: null,
				})
				const boardId = Number(selectedBoardId)
				return buildOptions_columnsForBoard_statusOnly(boards, boardId)
			},

			async listStatusLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedBoardId = this.getCurrentNodeParameter("boardId")
				const statusColumnKey = this.getCurrentNodeParameter("statusColumnKey") as string
				if (!selectedBoardId || !statusColumnKey) return []

				const boards = await invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
					thisArg: this,
					body: null,
				})
				const boardId = Number(selectedBoardId)
				const board = getBoardById({ boards, boardId })
				if (!board) return []

				const statusCol = board.columnSchema.find((c) => c.columnKey === statusColumnKey)
				if (!statusCol || statusCol.columnType !== "status") return []

				const { labels } = helper.parseStatus_columnJson({
					columnJSON: statusCol.columnJSON ?? "",
				})
				return labels.map((l: { label: string; enumKey: string }) => ({
					name: l.label,
					value: l.enumKey,
				}))
			},
		},
	}
}

const ZWebhookData = z.object({
	webhookId: z.number(),
	clientSubscriptionId: z.string(),
	signingSecret: z.string(),
	configHash: z.string(),
})

type TWebhookData = z.infer<typeof ZWebhookData>

function setWebhookData_inWorkflowStaticData(input: {
	this: IHookFunctions
	webhookData: TWebhookData
}) {
	const webhookData = input.this.getWorkflowStaticData("node")

	for (const key in input.webhookData) {
		webhookData[key] = input.webhookData[key as keyof typeof input.webhookData]
	}
}

function getWebhookData_fromWorkflowStaticData(input: {
	this: IHookFunctions
}): TWebhookData | null {
	const webhookData = input.this.getWorkflowStaticData("node")

	const parseResult = ZWebhookData.safeParse(webhookData)
	if (!parseResult.success) {
		return null
	}
	return parseResult.data
}

function buildConfigHash(input: {
	webhookUrl: string
	boardId: string
	statusColumnKey: string
	fromStatusLabels: string[]
	toStatusLabels: string[]
}): string {
	const sortedFrom = [...(input.fromStatusLabels ?? [])].sort()
	const sortedTo = [...(input.toStatusLabels ?? [])].sort()
	const payload = JSON.stringify({
		webhookUrl: input.webhookUrl,
		boardId: input.boardId,
		statusColumnKey: input.statusColumnKey,
		fromStatusLabels: sortedFrom,
		toStatusLabels: sortedTo,
	})
	let hash = 0
	for (let i = 0; i < payload.length; i++) {
		hash = (hash * 31 + payload.charCodeAt(i)) >>> 0
	}
	return String(hash)
}

function generateClientSubscriptionId(input: { this: IHookFunctions }): string {
	const wf = input.this.getWorkflow() as { id?: string } | undefined
	const node = input.this.getNode() as { id?: string } | undefined
	const instanceId = "n8n"
	const random = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
	return `flowoffice:n8n:${instanceId}:${wf?.id ?? "wf"}:${node?.id ?? "node"}:${random}`
}

function generateSigningSecret(): string {
	// Lightweight random for runtime use without Node 'crypto' types
	return Array.from({ length: 44 })
		.map(
			() =>
				"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[
					Math.floor(Math.random() * 64)
				],
		)
		.join("")
}
