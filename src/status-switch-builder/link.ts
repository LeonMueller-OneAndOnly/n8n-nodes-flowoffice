const STATUS_SWITCH_BUILDER_BASE_URL =
	"https://app.flow-office.eu/n8n-docs/tools/status-switch-builder"

export interface BuildStatusSwitchBuilderUrlOptions {
	baseUrl?: string
	boardId?: string | number | null
	statusColumnKey?: string | null
	ignoredStatusColumnValues?: Array<string | number | null | undefined>
}

export function buildStatusSwitchBuilderUrl(
	options: BuildStatusSwitchBuilderUrlOptions = {},
): string {
	const { baseUrl, boardId, statusColumnKey, ignoredStatusColumnValues = [] } = options

	const effectiveBaseUrl = baseUrl ?? STATUS_SWITCH_BUILDER_BASE_URL
	const ignored = new Set(
		ignoredStatusColumnValues
			.filter((value) => value !== undefined && value !== null)
			.map((value) => String(value).trim())
			.filter((value) => value.length > 0),
	)

	const normalize = (value: string | number | null | undefined): string | undefined => {
		if (value === undefined || value === null) return undefined
		const normalized = String(value).trim()
		if (!normalized) return undefined
		return normalized
	}

	const normalizedBoardId = normalize(boardId)
	const normalizedStatusColumnKey = normalize(statusColumnKey)

	const params: string[] = []

	if (normalizedBoardId && !ignored.has(normalizedBoardId)) {
		params.push(`boardId=${encodeURIComponent(normalizedBoardId)}`)
	}

	if (normalizedStatusColumnKey && !ignored.has(normalizedStatusColumnKey)) {
		params.push(`statusColumnKey=${encodeURIComponent(normalizedStatusColumnKey)}`)
	}

	const query = params.length ? `?${params.join("&")}` : ""

	return `${effectiveBaseUrl}${query}`
}

interface BuildStatusSwitchBuilderNoticeExpressionOptions {
	boardIdExpression: string
	statusColumnKeyExpression?: string
	ignoredStatusColumnValues?: string[]
}

export function buildStatusSwitchBuilderNoticeExpression(
	options: BuildStatusSwitchBuilderNoticeExpressionOptions,
): string {
	const { boardIdExpression, statusColumnKeyExpression, ignoredStatusColumnValues = [] } = options

	const functionSource = buildStatusSwitchBuilderUrl.toString()
	const ignoredValuesLiteral = JSON.stringify(ignoredStatusColumnValues)
	const statusExpression = statusColumnKeyExpression ?? "undefined"
	const baseUrlLiteral = JSON.stringify(STATUS_SWITCH_BUILDER_BASE_URL)

	return `={{ (() => {
	const buildStatusSwitchBuilderUrl = ${functionSource};
	const url = buildStatusSwitchBuilderUrl({
		baseUrl: ${baseUrlLiteral},
		boardId: ${boardIdExpression},
		statusColumnKey: ${statusExpression},
		ignoredStatusColumnValues: ${ignoredValuesLiteral},
	});
	return 'Need a ready-made Switch node per status label? Add the "Status Column Switch Builder (FlowOffice)" node or open the <a href="' + url + '" target="_blank">web builder</a>.';
})() }}`
}

export { STATUS_SWITCH_BUILDER_BASE_URL }
