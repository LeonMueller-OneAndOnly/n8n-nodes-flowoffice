import { z } from "zod"

const ZColumnType = z.enum([
  //mandatory columns
  "name",

  // regular columns
  "text",
  "number",
  "date",
  "checkbox",
  "interval",

  "phone",
  "email",
  "address",

  "rating-stars",
  "erneut-kontaktieren",
  "link",
  "personName",

  "zeitauswertung",

  "formel",

  // columns with options
  "status",
  "dokument",

  // project special columns
  "kunde",
  "teamMember",
  "aufgaben",
  "cloud",
  "lager",
])

const ZColumn = z.object({
  columnKey: z.string(),
  label: z.string(),
  columnType: ZColumnType,

  columnJSON: z.string().optional(), // For additional column options
  deactivated: z.boolean().optional(), // Instead of deleting columns only deactivate them to prevent users from shotting themself in the leg
  disableEditing: z.boolean().optional(), // For showing rows, but preventing users from editing them
})

export const ZListBoardsOutput = z.object({
  boards: z
    .object({
      boardId: z.number().int(),
      name: z.string(),
      columnSchema: ZColumn.array(),
    })
    .array(),
})
