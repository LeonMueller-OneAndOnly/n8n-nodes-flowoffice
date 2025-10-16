import { ZListBoardsOutput } from "./board"

export const apiSchema_v1 = {
  board: {
    listBoards: {
      pathname: "/api/v1/board/list-boards",
      schema: ZListBoardsOutput,
    },
  },
} as const
