import { defineComponent, nextTick, ref, shallowRef } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePublicContinuousGallery } from './usePublicContinuousGallery.ts'
import type { MediaItem, PublicGalleryPage } from '../publicTypes.ts'
import { createDefaultGallerySettings } from '../domain/gallerySettings.ts'

vi.mock('../services/publicGalleryApi.ts', () => ({ fetchPublicGalleryPage: vi.fn() }))
import { fetchPublicGalleryPage } from '../services/publicGalleryApi.ts'

const item = (id: number) => ({ id, name: `${id}.jpg`, mimeType: 'image/jpeg' }) as MediaItem
function page(first: number, count: number, offset: number, total: number): PublicGalleryPage {
	return {
		gallery: { id: 1, title: 'Gallery', deliveryMode: 'standard', settings: createDefaultGallerySettings() },
		items: Array.from({ length: count }, (_, index) => item(first + index)), s: [], total, limit: count, offset, page: 1, pageSize: count, pageCount: 1,
		focusIndex: null, previousCursor: null, nextCursor: null, path: '', groups: {},
		indexState: { indexed: total, limit: 5000, limitReached: false, complete: true },
		scope: { startPath: '', viewMode: 'folder', groupDepth: 1 },
	}
}

function harness(initial: PublicGalleryPage, enabled = true) {
	const snapshot = shallowRef<PublicGalleryPage | undefined>(initial)
	const activeIndex = ref<number | null>(null)
	let state!: ReturnType<typeof usePublicContinuousGallery>
	const wrapper = mount(defineComponent({
		setup() {
			state = usePublicContinuousGallery({
				enabled: () => enabled, snapshot, replace: value => { snapshot.value = value }, url: (offset, limit) => `/gallery?offset=${offset}&limit=${limit}`,
				mediaItems: () => snapshot.value?.items ?? [], activeIndex: () => activeIndex.value,
			})
			return () => null
		},
	}))
	return { state, snapshot, activeIndex, wrapper }
}
afterEach(() => vi.clearAllMocks())

describe('continuous public gallery loading', () => {
	it('appends the next batch from the loaded offset', async () => {
		vi.mocked(fetchPublicGalleryPage).mockResolvedValueOnce(page(49, 48, 48, 100))
		const { state, snapshot, wrapper } = harness(page(1, 48, 0, 100))
		await state.loadMore()
		expect(fetchPublicGalleryPage).toHaveBeenCalledWith('/gallery?offset=48&limit=48', expect.any(AbortSignal))
		expect(snapshot.value?.items).toHaveLength(96)
		expect(state.hasMore.value).toBe(true)
		wrapper.unmount()
	})

	it('drops a batch when the snapshot was replaced meanwhile', async () => {
		let resolve!: (value: PublicGalleryPage) => void
		vi.mocked(fetchPublicGalleryPage).mockReturnValueOnce(new Promise(done => { resolve = done }))
		const { state, snapshot, wrapper } = harness(page(1, 48, 0, 100))
		const pending = state.loadMore()
		snapshot.value = page(500, 10, 0, 10)
		resolve(page(49, 48, 48, 100))
		await pending
		expect(snapshot.value?.items[0]?.id).toBe(500)
		expect(snapshot.value?.items).toHaveLength(10)
		wrapper.unmount()
	})

	it('offers a retry after a failed batch', async () => {
		vi.mocked(fetchPublicGalleryPage).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(page(49, 2, 48, 50))
		const { state, snapshot, wrapper } = harness(page(1, 48, 0, 50))
		await state.loadMore()
		expect(state.failed.value).toBe(true)
		await state.loadMore()
		expect(state.failed.value).toBe(false)
		expect(state.hasMore.value).toBe(false)
		expect(snapshot.value?.items).toHaveLength(50)
		wrapper.unmount()
	})

	it('backfills everything before a focused page', async () => {
		vi.mocked(fetchPublicGalleryPage).mockResolvedValueOnce(page(1, 200, 0, 300)).mockResolvedValueOnce(page(201, 40, 200, 300))
		const { state, wrapper } = harness(page(1, 48, 0, 300))
		const merged = await state.fromStart(page(241, 48, 240, 300), () => true)
		expect(vi.mocked(fetchPublicGalleryPage).mock.calls.map(call => call[0])).toEqual(['/gallery?offset=0&limit=200', '/gallery?offset=200&limit=40'])
		expect(merged.items).toHaveLength(288)
		expect(merged).toMatchObject({ offset: 0, page: 1 })
		wrapper.unmount()
	})

	it('prefetches while the lightbox approaches the last loaded photo', async () => {
		vi.mocked(fetchPublicGalleryPage).mockResolvedValue(page(49, 48, 48, 100))
		const { activeIndex, wrapper } = harness(page(1, 48, 0, 100))
		activeIndex.value = 30
		await nextTick()
		expect(fetchPublicGalleryPage).not.toHaveBeenCalled()
		activeIndex.value = 43
		await nextTick()
		expect(fetchPublicGalleryPage).toHaveBeenCalledOnce()
		wrapper.unmount()
	})

	it('stays idle when continuous browsing is off', async () => {
		const { state, wrapper } = harness(page(1, 48, 0, 100), false)
		await state.loadMore()
		expect(state.hasMore.value).toBe(false)
		expect(fetchPublicGalleryPage).not.toHaveBeenCalled()
		wrapper.unmount()
	})
})
