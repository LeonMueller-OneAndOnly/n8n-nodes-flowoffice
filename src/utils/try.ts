export type Result<T extends any> = { success: false; error: unknown } | { success: true; data: T }

export async function tryTo_async<T>(fn: () => Promise<T>): Promise<Result<T>> {
	try {
		const data = await fn()
		return { success: true, data }
	} catch (error) {
		return { success: false, error }
	}
}

export function tryTo<T>(fn: () => T): Result<T> {
	try {
		const data = fn()
		return { success: true, data }
	} catch (error) {
		return { success: false, error }
	}
}
