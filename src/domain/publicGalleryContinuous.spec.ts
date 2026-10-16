import { describe, expect, it } from 'vitest'
import { appendContinuousPage, collaborationWindow, continuousHasMore, prependContinuousPages, refreshContinuousPage } from './publicGalleryContinuous.ts'
import { createDefaultGallerySettings } from './gallerySettings.ts'
import type { MediaItem, PublicGalleryPage } from '../publicTypes.ts'

const item = (id: number, folder = false) => ({ id, name: `${id}.jpg`, mimeType: folder ? 'httpd/unix-directory' : 'image/jpeg', folder }) as MediaItem
const ids = (page: PublicGalleryPage) => page.items.map(value => value.id)

function page(first: number, count: number, offset: number, total: number): PublicGalleryPage {
	return {
		gallery: { id: 1, title: 'Gallery', deliveryMode: 'standard', settings: createDefaultGallerySettings() },
		items: Array.from({ length: count }, (_, index) => item(first + index)), s: [], total, limit: count, offset,
		page: Math.floor(offset / Math.max(1, count)) + 1, pageSize: count, pageCount: Math.ceil(total / Math.max(1, count)),
		focusIndex: null, previousCursor: null, nextCursor: null, path: '', groups: {},
		indexState: { indexed: total, limit: 5000, limitReached: false, complete: true },
		scope: { startPath: '', viewMode: 'folder', groupDepth: 1 },
	}
}

describe('continuous public gallery pages', () => {
	it('appends batches without duplicates and presents one page', () => {
		const merged = appendContinuousPage(page(1, 3, 0, 6), { ...page(3, 3, 3, 6) })
		expect(ids(merged)).toEqual([1, 2, 3, 4, 5])
		expect(merged).toMatchObject({ offset: 0, page: 1, pageCount: 1, total: 6 })
	})

	it('prepends earlier batches before a focused page', () => {
		const merged = prependContinuousPages([page(1, 2, 0, 6), page(3, 2, 2, 6)], { ...page(5, 2, 4, 6), focusIndex: 4 })
		expect(ids(merged)).toEqual([1, 2, 3, 4, 5, 6])
		expect(merged).toMatchObject({ offset: 0, page: 1, focusIndex: null })
		expect(continuousHasMore(merged)).toBe(false)
	})

	it('keeps loaded items beyond a shorter live refresh', () => {
		const current = page(1, 6, 0, 6)
		const fresh = { ...page(10, 2, 0, 7), items: [item(10), item(1)] }
		expect(ids(refreshContinuousPage(current, fresh))).toEqual([10, 1, 2, 3, 4, 5, 6])
		expect(ids(refreshContinuousPage(current, { ...page(20, 2, 0, 8) }))).toEqual([20, 21, 3, 4, 5, 6])
	})

	it('reports whether more items remain', () => {
		expect(continuousHasMore(page(1, 3, 0, 4))).toBe(true)
		expect(continuousHasMore(page(1, 4, 0, 4))).toBe(false)
		expect(continuousHasMore(undefined)).toBe(false)
	})

	it('chooses a bounded media window near the viewport', () => {
		const items = [item(1, true), ...Array.from({ length: 300 }, (_, index) => item(index + 2))]
		expect(collaborationWindow(items, 0).map(value => value.id).slice(0, 2)).toEqual([2, 3])
		expect(collaborationWindow(items, 0)).toHaveLength(200)
		expect(collaborationWindow(items, 100)[0]!.id).toBe(49)
		expect(collaborationWindow(items, 110)[0]!.id).toBe(49)
		expect(collaborationWindow(items, 280)).toHaveLength(301 - 192)
	})
})
