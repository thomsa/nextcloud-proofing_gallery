import type { MediaItem } from '../publicTypes.ts'

// URLs of a public gallery's media endpoints, relative to its share token.
export function publicMediaUrls(endpoint: (path: string) => string) {
	const previewUrl = (item: Pick<MediaItem, 'id'>, width = 900, height = 900, mode: 'cover' | 'fit' = 'cover') => endpoint(`media/${item.id}/preview?x=${width}&y=${height}&mode=${mode}`)
	return {
		previewUrl,
		tilePreviewUrl: (item: Pick<MediaItem, 'id'>) => previewUrl(item, 900, 900, 'fit'),
		streamUrl: (item: Pick<MediaItem, 'id'>) => endpoint(`media/${item.id}/stream`),
		selectionExportUrl(selectionId: string, format: 'csv' | 'plain' | 'search', fields: string[] = []): string {
			const url = new URL(endpoint(`collaboration/selections/${selectionId}/export`), window.location.origin)
			url.searchParams.set('format', format)
			if (fields.length) url.searchParams.set('fields', fields.join(','))
			return url.toString()
		},
	}
}
