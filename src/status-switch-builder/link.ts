const STATUS_SWITCH_BUILDER_BASE_URL =
	"https://app.flow-office.eu/n8n-docs/tools/status-switch-builder"

export function getStatusSwitchBuilderHintDisplayname() {
	return `Do you need to work with different status labels in your workflow? Use our web-tool to create a copy-pastable switch node for your specific status column: <a href='${STATUS_SWITCH_BUILDER_BASE_URL}' target='_blank'>status switch web builder</a>`
}
