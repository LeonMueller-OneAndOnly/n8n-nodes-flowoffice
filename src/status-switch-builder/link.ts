const STATUS_SWITCH_BUILDER_BASE_URL =
	"https://app.flow-office.eu/n8n-docs/tools/status-switch-builder"

export function getStatusSwitchBuilderHintDisplayname() {
	return `Need to filter by a status in your workflow? Use our status-switch-builder tool to create a copy-pastable n8n-switch-node for your specific status column: <a href='${STATUS_SWITCH_BUILDER_BASE_URL}' target='_blank'>web builder</a>`
}
