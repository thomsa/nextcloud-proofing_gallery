import { ref } from 'vue'
import type { MediaItem } from '../publicTypes.ts'

// Natural image sizes learned from loaded previews refine the grid layout.
export function usePublicMediaDimensions() {
	const mediaDimensions = ref<Record<number, { width: number; height: number }>>({})
	function itemRatio(item: MediaItem): number {
		const dimensions = mediaDimensions.value[item.id]
		const width = dimensions?.width ?? item.width ?? item.metadata?.width ?? 0
		const height = dimensions?.height ?? item.height ?? item.metadata?.height ?? 0
		if (width > 0 && height > 0) return width / height
		return item.mimeType.startsWith('video/') ? 16 / 9 : 4 / 3
	}
	function rememberDimensions(item: MediaItem, event: Event) {
		const image = event.currentTarget as HTMLImageElement
		if (!image.naturalWidth || !image.naturalHeight) return
		mediaDimensions.value = { ...mediaDimensions.value, [item.id]: { width: image.naturalWidth, height: image.naturalHeight } }
	}
	return { mediaDimensions, itemRatio, rememberDimensions }
}
