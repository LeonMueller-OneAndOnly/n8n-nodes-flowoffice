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

	const ignoredValuesLiteral = JSON.stringify(ignoredStatusColumnValues)
	const baseUrlLiteral = JSON.stringify(STATUS_SWITCH_BUILDER_BASE_URL)
	const statusExpression = statusColumnKeyExpression ?? "undefined"

	const urlExpression = `{{ (() => {
	const ignored = new Set(${ignoredValuesLiteral});
	const normalize = (value) => {
		if (value === undefined || value === null) {
			return undefined;
		}
		const normalized = String(value).trim();
		return normalized.length > 0 ? normalized : undefined;
	};
	const params = [];
	const pushParam = (key, raw) => {
		const normalized = normalize(raw);
		if (!normalized || ignored.has(normalized)) {
			return;
		}
		params.push(key + '=' + encodeURIComponent(normalized));
	};
	pushParam('boardId', ${boardIdExpression});
	pushParam('statusColumnKey', ${statusExpression});
	return ${baseUrlLiteral} + (params.length ? '?' + params.join('&') : '');
})() }}`

	return `Do you need to filter by a status in your workflow? Use our Status-Switch-Builder to easily create a n8n-switch-node with all status labels: <a href='${urlExpression}' target='_blank'>web builder</a>`
}

export { STATUS_SWITCH_BUILDER_BASE_URL }
