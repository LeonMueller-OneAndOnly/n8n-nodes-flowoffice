import { n8nApi_v1 } from "./transport/api-schema-bundled/api"

import z from "zod"

export function getColumnTypeDisplayName(
	columnType: z.infer<typeof n8nApi_v1.schemas.ZColumnType>,
): string {
	switch (columnType) {
		case "name":
			return "Name"
		case "text":
			return "Text"
		case "status":
			return "Status"
		case "number":
			return "Number"
		case "date":
			return "Date"
		case "checkbox":
			return "Checkbox"
		case "interval":
			return "Interval"
		case "phone":
			return "Phone"
		case "email":
			return "Email"
		case "address":
			return "Address"
		case "rating-stars":
			return "Rating Stars"
		case "erneut-kontaktieren":
			return "Contact again at"
		case "link":
			return "Link"
		case "personName":
			return "Person Name"
		case "zeitauswertung":
			return "Time Evaluation"
		case "formel":
			return "Formula"
		case "dokument":
			return "Document"
		case "lager":
			return "Warehouse"
		case "kunde":
			return "Customer"
		case "teamMember":
			return "Team Member"
		case "aufgaben":
			return "Tasks"
		case "cloud":
			return "Cloud"
		default:
			// eslint-disable-next-line no-case-declarations
			const _never: never = columnType
			return _never
	}
}
