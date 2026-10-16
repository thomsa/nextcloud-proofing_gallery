import type { MediaItem, PublicGalleryPage } from '../publicTypes.ts'

/** Requests used while scrolling continuously; the server accepts up to 200 items. */
export const CONTINUOUS_BATCH_SIZE = 48
export const CONTINUOUS_BACKFILL_SIZE = 200
/** The collaboration endpoint hydrates at most this many visible media IDs. */
export const COLLABORATION_WINDOW_SIZE = 200

function uniqueItems(items: MediaItem[]): MediaItem[] {
	const seen = new Set<number>()
	return items.filter(item => !seen.has(item.id) && !!seen.add(item.id))
}

// A continuous snapshot always starts at the first item and reports one page.
function continuousSnapshot(base: PublicGalleryPage, items: MediaItem[]): PublicGalleryPage {
	return { ...base, items, offset: 0, page: 1, pageCount: 1, focusIndex: null }
}

// Appends the next batch, keeping the newest totals and arrangement from the server.
export function appendContinuousPage(current: PublicGalleryPage, next: PublicGalleryPage): PublicGalleryPage {
	return continuousSnapshot(next, uniqueItems([...current.items, ...next.items]))
}

// Prepends batches that precede a focused page so a deep link still starts at the top.
export function prependContinuousPages(earlier: PublicGalleryPage[], current: PublicGalleryPage): PublicGalleryPage {
	return continuousSnapshot(current, uniqueItems([...earlier.flatMap(page => page.items), ...current.items]))
}

// Replaces the leading items with a fresh live-update response and keeps what was loaded beyond it.
export function refreshContinuousPage(current: PublicGalleryPage, fresh: PublicGalleryPage): PublicGalleryPage {
	const freshIds = new Set(fresh.items.map(item => item.id))
	// Resume after the last fresh item that was already loaded, so items shifted by an insertion stay visible.
	const anchor = current.items.findLastIndex(item => freshIds.has(item.id))
	const tail = current.items.slice(anchor < 0 ? fresh.items.length : anchor + 1).filter(item => !freshIds.has(item.id))
	return continuousSnapshot(fresh, uniqueItems([...fresh.items, ...tail]).slice(0, Math.max(fresh.total, fresh.items.length)))
}

export function continuousHasMore(page: PublicGalleryPage | undefined): boolean {
	return !!page && page.offset + page.items.length < page.total
}

// Chooses up to `size` media items around the first visible grid index for
// collaboration hydration. The start snaps to batch boundaries so ordinary
// scrolling does not re-request review state for every rendered row.
export function collaborationWindow(items: MediaItem[], firstVisible: number, size = COLLABORATION_WINDOW_SIZE, step = CONTINUOUS_BATCH_SIZE): MediaItem[] {
	const start = Math.max(0, Math.floor(Math.max(0, firstVisible - step) / step) * step)
	return items.slice(start).filter(item => !item.folder).slice(0, size)
}
