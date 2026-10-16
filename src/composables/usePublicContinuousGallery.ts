import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { ShallowRef } from 'vue'
import type { MediaItem, PublicGalleryPage } from '../publicTypes.ts'
import { fetchPublicGalleryPage } from '../services/publicGalleryApi.ts'
import { appendContinuousPage, collaborationWindow, CONTINUOUS_BACKFILL_SIZE, CONTINUOUS_BATCH_SIZE, continuousHasMore, prependContinuousPages, refreshContinuousPage } from '../domain/publicGalleryContinuous.ts'

/** Lightbox steps remaining before the next batch is requested. */
const LIGHTBOX_PREFETCH_DISTANCE = 6

// Grows one public page snapshot in place instead of replacing it per page.
export function usePublicContinuousGallery(options: {
	enabled: () => boolean
	snapshot: ShallowRef<PublicGalleryPage | undefined>
	replace(page: PublicGalleryPage): void
	url(offset: number, limit: number): string
	mediaItems: () => MediaItem[]
	activeIndex: () => number | null
}) {
	const appending = ref(false)
	const failed = ref(false)
	const firstVisible = ref(0)
	let controller: AbortController | undefined
	const hasMore = computed(() => options.enabled() && continuousHasMore(options.snapshot.value))

	async function loadMore() {
		const current = options.snapshot.value
		if (!current || appending.value || !hasMore.value) return
		const request = new AbortController()
		controller = request
		appending.value = true
		failed.value = false
		try {
			const next = await fetchPublicGalleryPage(options.url(current.offset + current.items.length, CONTINUOUS_BATCH_SIZE), request.signal)
			// A navigation, search or live refresh replaced the snapshot meanwhile.
			if (request.signal.aborted || options.snapshot.value !== current) return
			options.replace(appendContinuousPage(current, next))
		} catch {
			if (!request.signal.aborted) failed.value = true
		} finally {
			if (controller === request) { controller = undefined; appending.value = false }
		}
	}

	// Loads everything before a focused page so a deep-linked photo keeps the gallery start above it.
	async function fromStart(page: PublicGalleryPage, current: () => boolean): Promise<PublicGalleryPage> {
		if (!options.enabled() || page.offset <= 0) return page
		const offsets = Array.from({ length: Math.ceil(page.offset / CONTINUOUS_BACKFILL_SIZE) }, (_, index) => index * CONTINUOUS_BACKFILL_SIZE)
		const request = new AbortController()
		try {
			const earlier = await Promise.all(offsets.map(offset => fetchPublicGalleryPage(
				options.url(offset, Math.min(CONTINUOUS_BACKFILL_SIZE, page.offset - offset)), request.signal,
			)))
			return current() ? prependContinuousPages(earlier, page) : page
		} catch {
			// Keep the focused batch; scrolling still continues forward from it.
			request.abort()
			return page
		}
	}

	function cancel() {
		controller?.abort()
		controller = undefined
		appending.value = false
	}

	const refreshUrl = () => options.url(0, Math.min(CONTINUOUS_BACKFILL_SIZE, Math.max(CONTINUOUS_BATCH_SIZE, options.snapshot.value?.items.length ?? 0)))
	// A refresh focused on the open photo may answer with a later batch; only a leading batch can be merged.
	const refresh = (fresh: PublicGalleryPage): PublicGalleryPage | null => fresh.offset > 0 ? null : options.snapshot.value ? refreshContinuousPage(options.snapshot.value, fresh) : fresh
	const collaborationItems = computed(() => options.enabled() ? collaborationWindow(options.snapshot.value?.items ?? [], firstVisible.value) : options.mediaItems())

	// Keep the lightbox ahead of the loaded range so stepping forward never reaches a false end.
	watch(() => [options.activeIndex(), options.mediaItems().length] as const, ([index, count]) => {
		if (index !== null && index >= count - LIGHTBOX_PREFETCH_DISTANCE) void loadMore()
	})
	watch(() => options.snapshot.value?.items, (items, previous) => {
		if (items?.[0]?.id !== previous?.[0]?.id) firstVisible.value = 0
	})
	onBeforeUnmount(cancel)
	return { appending, failed, hasMore, loadMore, fromStart, cancel, refreshUrl, refresh, collaborationItems, setVisibleRange: (first: number) => { firstVisible.value = first } }
}
