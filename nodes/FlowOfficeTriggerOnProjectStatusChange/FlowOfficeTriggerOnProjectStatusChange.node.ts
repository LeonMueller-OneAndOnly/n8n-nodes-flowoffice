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
import { NodeConnectionTypes } from "n8n-workflow"

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
import { tryTo_async } from "../../src/utils/try"

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
				hint: "Select the status column to watch.",
			},

			// Optional Filters
			{
				displayName: "Optional Filters",
				name: "optionalFilters",
				type: "collection",
				placeholder: "Configure optional filters",
				default: {},
				options: [
					{
						displayName: "Subboard Name or ID",
						name: "subBoardId",
						type: "options",
						default: "",
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						displayOptions: {
							hide: {
								"/boardId": [""],
							},
						},
						typeOptions: {
							loadOptionsDependsOn: ["/boardId"],
							loadOptionsMethod: "listSubboards",
						},
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
						hint: "Optional. Trigger only when the previous (FROM) status matches any selected label. Leave empty to match ANY from-status. If both FROM and TO are set, both filters must match.",
						displayOptions: {
							hide: {
								"/boardId": [""],
								"/statusColumnKey": ["", EmptyStatusColumnName],
							},
						},
						typeOptions: {
							loadOptionsDependsOn: ["/boardId", "/statusColumnKey"],
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
						hint: "Optional. Trigger only when the new (TO) status matches any selected label. Leave empty to match ANY to-status. If both FROM and TO are set, both filters must match.",
						displayOptions: {
							hide: {
								"/boardId": [""],
								"/statusColumnKey": ["", EmptyStatusColumnName],
							},
						},
						typeOptions: {
							loadOptionsDependsOn: ["/boardId", "/statusColumnKey"],
							loadOptionsMethod: "listStatusLabels",
						},
					},
				],
			},
		],
	}

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				this.logger.info("Checking if webhook exists")

				const staticData = this.getWorkflowStaticData("node") as unknown as Partial<TWebhookData>

				const webhookUrl = this.getNodeWebhookUrl("default") as string

				const boardId = this.getNodeParameter("boardId") as string
				const statusColumnKey = this.getNodeParameter("optionalFilters.statusColumnKey") as string

				const fromStatusLabels =
					(this.getNodeParameter("optionalFilters.fromStatusLabels") as string[]) || []
				const toStatusLabels =
					(this.getNodeParameter("optionalFilters.toStatusLabels") as string[]) || []
				const subBoardId = this.getNodeParameter("optionalFilters.subboardId") as string

				const currentConfigHash = buildConfigHash({
					webhookUrl,
					boardId,
					statusColumnKey,
					fromStatusLabels,
					toStatusLabels,
					subBoardId,
				})

				if (
					!staticData ||
					staticData.subscriptionId === undefined ||
					staticData.clientSubscriptionId === undefined
				) {
					this.logger.info("Static data is missing, creating new webhook")
					return false
				}

				if (staticData.configHash !== currentConfigHash) {
					this.logger.info("Webhook config hash mismatch, creating new webhook")
					return false
				}

				const getSchema = {
					...n8nApi_v1.webhooks.projectStatusChanged.get,
					pathname: n8nApi_v1.webhooks.projectStatusChanged.get.pathname.replace(
						"[subscriptionId]",
						encodeURIComponent(staticData.clientSubscriptionId as string),
					),
				}
				const apiResult_check = await tryTo_async(async () =>
					invokeEndpoint(getSchema, {
						thisArg: this,
						body: null,
						displayOutput_whenZodParsingFails: true,
					}),
				)

				if (!apiResult_check.success) {
					this.logger.error(`Webhook check failed: ${apiResult_check.error}`)
					return false
				}

				if (!apiResult_check.data.active) {
					this.logger.info("Webhook found but inactive, creating/upserting webhook")
					return false
				}

				this.logger.info(
					"Webhook config hash matches & was returned from api, using existing webhook",
				)
				return true
			},
			async create(this: IHookFunctions): Promise<boolean> {
				this.logger.info("Creating webhook")

				const webhookUrl = this.getNodeWebhookUrl("default") as string

				const boardId = this.getNodeParameter("boardId") as string
				const statusColumnKey = this.getNodeParameter("optionalFilters.statusColumnKey") as string

				const fromStatusLabels =
					(this.getNodeParameter("optionalFilters.fromStatusLabels") as string[]) || []
				const toStatusLabels =
					(this.getNodeParameter("optionalFilters.toStatusLabels") as string[]) || []
				const subBoardId = this.getNodeParameter("optionalFilters.subboardId") as string

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
					subBoardId,
				})

				const upsertBody = {
					url: webhookUrl,
					boardId: Number(boardId),
					statusColumnKey,
					subBoardId: subBoardId.trim() ? Number(subBoardId) : null,
					fromStatusLabelKeys: [...fromStatusLabels],
					toStatusLabelKeys: [...toStatusLabels],
					signingSecret,
					configHash,
				}

				const upsertSchema = {
					...n8nApi_v1.webhooks.projectStatusChanged.upsert,
					pathname: n8nApi_v1.webhooks.projectStatusChanged.upsert.pathname.replace(
						"[subscriptionId]",
						encodeURIComponent(clientSubscriptionId),
					),
				}
				const apiResponse = await tryTo_async(async () =>
					invokeEndpoint(upsertSchema, {
						thisArg: this,
						body: upsertBody,
					}),
				)

				if (!apiResponse.success) {
					this.logger.error(`Failed to upsert webhook: ${apiResponse.error}`)
					return false
				}

				const subscriptionId = apiResponse.data.id
				const effectiveSigningSecret = signingSecret

				setWebhookData_inWorkflowStaticData({
					this: this,
					webhookData: {
						subscriptionId,
						clientSubscriptionId,
						signingSecret: effectiveSigningSecret,
						configHash,
					},
				})

				return true
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				this.logger.info("Deleting webhook")

				const saved = getWebhookData_fromWorkflowStaticData({ this: this })
				if (!saved) {
					return true
				}

				const deleteSchema = {
					...n8nApi_v1.webhooks.projectStatusChanged.delete,
					pathname: n8nApi_v1.webhooks.projectStatusChanged.delete.pathname.replace(
						"[subscriptionId]",
						encodeURIComponent(saved.clientSubscriptionId),
					),
				}

				const deleteResult = await tryTo_async(async () =>
					invokeEndpoint(deleteSchema, {
						thisArg: this,
						body: null,
						displayOutput_whenZodParsingFails: true,
					}),
				)

				if (!deleteResult.success) {
					this.logger.error(`Failed to delete webhook: ${deleteResult.error}`)
					return false
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
	subscriptionId: z.string(),
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
	subBoardId: string
}): string {
	const sortedFrom = [...(input.fromStatusLabels ?? [])].sort()
	const sortedTo = [...(input.toStatusLabels ?? [])].sort()
	const payload = JSON.stringify({
		webhookUrl: input.webhookUrl,
		boardId: input.boardId,
		statusColumnKey: input.statusColumnKey,
		fromStatusLabels: sortedFrom,
		toStatusLabels: sortedTo,
		subBoardId: input.subBoardId,
	})
	// Base64url encode to ensure length and portability; satisfies min(16)
	const b64url = base64UrlEncode(payload)
	return b64url
}

function base64UrlEncode(input: string): string {
	const bytes = utf8Encode(input)
	let output = ""
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

	let i = 0
	for (; i + 2 < bytes.length; i += 3) {
		const a = bytes[i] as number
		const b = bytes[i + 1] as number
		const c = bytes[i + 2] as number
		const triple = (a << 16) | (b << 8) | c
		output +=
			alphabet.charAt((triple >> 18) & 63) +
			alphabet.charAt((triple >> 12) & 63) +
			alphabet.charAt((triple >> 6) & 63) +
			alphabet.charAt(triple & 63)
	}

	if (i < bytes.length) {
		const remaining = bytes.length - i
		const a = bytes[i] as number
		const b = remaining === 2 ? (bytes[i + 1] as number) : 0
		const triple = (a << 16) | (b << 8)
		output += alphabet.charAt((triple >> 18) & 63)
		output += alphabet.charAt((triple >> 12) & 63)
		output += remaining === 2 ? alphabet.charAt((triple >> 6) & 63) : "="
		output += "="
	}

	return output.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function utf8Encode(input: string): number[] {
	const bytes: number[] = []
	for (let i = 0; i < input.length; i++) {
		const codePoint = input.codePointAt(i) as number
		if (codePoint > 0xffff) i++
		if (codePoint <= 0x7f) {
			bytes.push(codePoint)
		} else if (codePoint <= 0x7ff) {
			bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f))
		} else if (codePoint <= 0xffff) {
			bytes.push(
				0xe0 | (codePoint >> 12),
				0x80 | ((codePoint >> 6) & 0x3f),
				0x80 | (codePoint & 0x3f),
			)
		} else {
			bytes.push(
				0xf0 | (codePoint >> 18),
				0x80 | ((codePoint >> 12) & 0x3f),
				0x80 | ((codePoint >> 6) & 0x3f),
				0x80 | (codePoint & 0x3f),
			)
		}
	}
	return bytes
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
