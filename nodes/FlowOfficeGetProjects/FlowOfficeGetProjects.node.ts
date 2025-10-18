import type {
\tIExecuteFunctions,
\tILoadOptionsFunctions,
\tINodeExecutionData,
\tINodePropertyOptions,
\tINodeType,
\tINodeTypeDescription,
} from "n8n-workflow"
import { NodeApiError, NodeConnectionTypes } from "n8n-workflow"

import { invokeEndpoint } from "../../src/transport/invoke-api"
import { n8nApi_v1 } from "../../src/transport/api-schema-bundled/api"
import { helper } from "../../src/transport/api-schema-bundled/helper"

import {
\tbuildOptions_boardId,
\tbuildOptions_subboardId,
\tbuildOptions_columnsForBoard_statusOnly,
\tgetBoardById,
} from "../../src/build-options/buildBoardOptions"

import z from "zod"

export class FlowOfficeGetProjects implements INodeType {
\tmethods = {
\t\tloadOptions: {
\t\t\tasync listBoards(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
\t\t\t\treturn invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
\t\t\t\t\tthisArg: this,
\t\t\t\t\tbody: null,
\t\t\t\t}).then(buildOptions_boardId)
\t\t\t},

\t\t\tasync listSubboards(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
\t\t\t\tconst selectedBoardId = this.getCurrentNodeParameter("boardId")
\t\t\t\tif (!selectedBoardId) return []

\t\t\t\tconst boards = await invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
\t\t\t\t\tthisArg: this,
\t\t\t\t\tbody: null,
\t\t\t\t})

\t\t\t\tconst boardId = Number(selectedBoardId)
\t\t\t\treturn buildOptions_subboardId({ boards, boardId })
\t\t\t},

\t\t\tasync listStatusColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
\t\t\t\tconst selectedBoardId = this.getCurrentNodeParameter("boardId")
\t\t\t\tif (!selectedBoardId) return []

\t\t\t\tconst boards = await invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
\t\t\t\t\tthisArg: this,
\t\t\t\t\tbody: null,
\t\t\t\t})
\t\t\t\tconst boardId = Number(selectedBoardId)
\t\t\t\treturn buildOptions_columnsForBoard_statusOnly(boards, boardId)
\t\t\t},

\t\t\tasync listStatusLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
\t\t\t\tconst selectedBoardId = this.getCurrentNodeParameter("boardId")
\t\t\t\tconst statusColumnKey = this.getCurrentNodeParameter("statusColumnKey") as string
\t\t\t\tif (!selectedBoardId || !statusColumnKey) return []

\t\t\t\tconst boards = await invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
\t\t\t\t\tthisArg: this,
\t\t\t\t\tbody: null,
\t\t\t\t})
\t\t\t\tconst boardId = Number(selectedBoardId)
\t\t\t\tconst board = getBoardById({ boards, boardId })
\t\t\t\tif (!board) return []

\t\t\t\tconst statusCol = board.columnSchema.find((c) => c.columnKey === statusColumnKey)
\t\t\t\tif (!statusCol || statusCol.columnType !== "status") return []

\t\t\t\tconst { labels } = helper.parseStatus_columnJson({
\t\t\t\t\tcolumnJSON: statusCol.columnJSON ?? "",
\t\t\t\t})
\t\t\t\treturn labels.map((l: { label: string; enumKey: string }) => ({
\t\t\t\t\tname: l.label,
\t\t\t\t\tvalue: l.enumKey,
\t\t\t\t}))
\t\t\t},
\t\t},
\t}
\tdescription: INodeTypeDescription = {
\t\tdisplayName: "Get Projects (FlowOffice)",
\t\tname: "flowOfficeGetProjects",
\t\ticon: {
\t\t\tlight: "file:FlowOfficeGetProjects.svg",
\t\t\tdark: "file:FlowOfficeGetProjects.dark.svg",
\t\t},
\t\tgroup: ["input"],
\t\tversion: 1,
\t\tdescription: "Fetch projects from FlowOffice with optional filters",
\t\tdefaults: {
\t\t\tname: "Get Projects (FlowOffice)",
\t\t},
\t\tinputs: [NodeConnectionTypes.Main],
\t\toutputs: [NodeConnectionTypes.Main],
\t\tusableAsTool: true,
\t\tcredentials: [
\t\t\t{
\t\t\t\tname: "flowOfficeApi",
\t\t\t\trequired: true,
\t\t\t},
\t\t],
\t\tproperties: [
\t\t\t{
\t\t\t\tdisplayName: "Board Name or ID",
\t\t\t\tplaceholder: "Select a board",
\t\t\t\tname: "boardId",
\t\t\t\ttype: "options",
\t\t\t\tdescription:
\t\t\t\t\t'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
\t\t\t\tdefault: "",
\t\t\t\trequired: false,
\t\t\t\ttypeOptions: {
\t\t\t\t\tloadOptionsMethod: "listBoards",
\t\t\t\t},
\t\t\t},
\t\t\t{
\t\t\t\tdisplayName: "Subboard Name or ID",
\t\t\t\tname: "subboardId",
\t\t\t\ttype: "options",
\t\t\t\tdescription:
\t\t\t\t\t'Choose a subboard of the selected board. The list populates after selecting a board. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
\t\t\t\tdefault: "",
\t\t\t\tdisplayOptions: {
\t\t\t\t\thide: {
\t\t\t\t\t\tboardId: [""],
\t\t\t\t\t},
\t\t\t\t},
\t\t\t\ttypeOptions: {
\t\t\t\t\tloadOptionsDependsOn: ["boardId"],
\t\t\t\t\tloadOptionsMethod: "listSubboards",
\t\t\t\t},
\t\t\t},
\t\t\t{
\t\t\t\tdisplayName: "Project ID",
\t\t\t\tname: "projectId",
\t\t\t\ttype: "number",
\t\t\t\tdefault: 0,
\t\t\t\trequired: false,
\t\t\t\tplaceholder: "e.g. 123",
\t\t\t},
\t\t\t{
\t\t\t\tdisplayName: "Project UUID",
\t\t\t\tname: "projectUuid",
\t\t\t\ttype: "string",
\t\t\t\tdefault: "",
\t\t\t\trequired: false,
\t\t\t\tplaceholder: "e.g. 550e8400-e29b-41d4-a716-446655440000",
\t\t\t},
\t\t\t{
\t\t\t\tdisplayName: "Name contains",
\t\t\t\tname: "name",
\t\t\t\ttype: "string",
\t\t\t\tdefault: "",
\t\t\t\trequired: false,
\t\t\t\tplaceholder: "e.g. Kundenprojekt",
\t\t\t},
\t\t\t{
\t\t\t\tdisplayName: "Status Column",
\t\t\t\tname: "statusColumnKey",
\t\t\t\ttype: "options",
\t\t\t\tdescription: "Select a status column to filter by",
\t\t\t\tdefault: "",
\t\t\t\tdisplayOptions: {
\t\t\t\t\thide: {
\t\t\t\t\t\tboardId: [""],
\t\t\t\t\t},
\t\t\t\t},
\t\t\t\ttypeOptions: {
\t\t\t\t\tloadOptionsDependsOn: ["boardId"],
\t\t\t\t\tloadOptionsMethod: "listStatusColumns",
\t\t\t\t},
\t\t\t\thint: "Optional. Choose a status column to use with From/To states.",
\t\t\t},
\t\t\t{
\t\t\t\tdisplayName: "From States",
\t\t\t\tname: "fromStates",
\t\t\t\ttype: "multiOptions",
\t\t\t\tdefault: [],
\t\t\t\trequired: false,
\t\t\t\tdescription: "Only projects currently in one of these states",
\t\t\t\tdisplayOptions: {
\t\t\t\t\tshow: {
\t\t\t\t\t\tstatusColumnKey: ["*"],
\t\t\t\t\t},
\t\t\t\t},
\t\t\t\ttypeOptions: {
\t\t\t\t\tloadOptionsDependsOn: ["boardId", "statusColumnKey"],
\t\t\t\t\tloadOptionsMethod: "listStatusLabels",
\t\t\t\t},
\t\t\t},
\t\t\t{
\t\t\t\tdisplayName: "To States",
\t\t\t\tname: "toStates",
\t\t\t\ttype: "multiOptions",
\t\t\t\tdefault: [],
\t\t\t\trequired: false,
\t\t\t\tdescription: "Only projects whose next state is one of these",
\t\t\t\tdisplayOptions: {
\t\t\t\t\tshow: {
\t\t\t\t\t\tstatusColumnKey: ["*"],
\t\t\t\t\t},
\t\t\t\t},
\t\t\t\ttypeOptions: {
\t\t\t\t\tloadOptionsDependsOn: ["boardId", "statusColumnKey"],
\t\t\t\t\tloadOptionsMethod: "listStatusLabels",
\t\t\t\t},
\t\t\t},
\t\t],
\t}

\tasync execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
\t\tconst boardIdRaw = this.getNodeParameter("boardId", 0, "")
\t\tconst subboardIdRaw = this.getNodeParameter("subboardId", 0, "")
\t\tconst projectIdRaw = this.getNodeParameter("projectId", 0, 0)
\t\tconst projectUuid = this.getNodeParameter("projectUuid", 0, "") as string
\t\tconst name = this.getNodeParameter("name", 0, "") as string
\t\tconst statusColumnKey = this.getNodeParameter("statusColumnKey", 0, "") as string
\t\tconst fromStates = this.getNodeParameter("fromStates", 0, []) as string[]
\t\tconst toStates = this.getNodeParameter("toStates", 0, []) as string[]

\t\tconst boardId = boardIdRaw ? z.coerce.number().int().parse(boardIdRaw) : undefined
\t\tconst subBoardId = subboardIdRaw ? z.coerce.number().int().parse(subboardIdRaw) : undefined
\t\tconst projectId = projectIdRaw ? z.coerce.number().int().parse(projectIdRaw) : undefined

\t\tconst body: any = {}
\t\tif (boardId !== undefined) body.boardId = boardId
\t\tif (subBoardId !== undefined) body.subBoardId = subBoardId
\t\tif (projectId !== undefined) body.projectId = projectId
\t\tif (projectUuid) body.projectUuid = projectUuid
\t\tif (name) body.name = name

\t\tif (statusColumnKey) {
\t\t\tbody.statusFilter = {
\t\t\t\tstatusColumnKey,
\t\t\t\tfromStates: Array.isArray(fromStates) ? fromStates : [],
\t\t\t\ttoStates: Array.isArray(toStates) ? toStates : [],
\t\t\t}
\t\t}

\t\ttry {
\t\t\t// Assume endpoint exists: n8nApi_v1.endpoints.projects.getProjects
\t\t\tconst response = await invokeEndpoint(
\t\t\t\t// @ts-expect-error endpoint will be added later by user
\t\t\t\tn8nApi_v1.endpoints.projects.getProjects,
\t\t\t\t{ thisArg: this, body },
\t\t\t)

\t\t\tconst outItem: INodeExecutionData = { json: response as unknown as Record<string, unknown> }
\t\t\treturn [[outItem]]
\t\t} catch (error) {
\t\t\tif (this.continueOnFail()) {
\t\t\t\treturn [[{ json: { error: (error as Error).message, filters: body } }]]
\t\t\t}
\t\t\tthrow new NodeApiError(this.getNode(), error)
\t\t}
\t}
}


