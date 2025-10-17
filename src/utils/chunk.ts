export function chunk<T>(array: T[], size: number): T[][] {
	const outputs: T[][] = []

	let aChunk = []

	let i = 0
	while (i < array.length) {
		const aElement = array[i]!
		aChunk.push(aElement)
		i++

		if (i % size === 0) {
			outputs.push(aChunk)
			aChunk = []
		}
	}

	if (aChunk.length > 0) {
		outputs.push(aChunk)
	}

	return outputs
}
