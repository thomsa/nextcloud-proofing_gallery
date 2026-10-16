import { computed, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { t } from '@nextcloud/l10n'
import type { CollaborationState, MediaItem, PublicReviewState } from '../publicTypes.ts'
import { pickSendState } from '../domain/publicPicks.ts'

// A reviewer's selection is the set of photos they marked as Pick. Picks are
// stored per reviewer on the server, so the selection survives reloads.
export function usePublicPicks(options: {
	enabled: () => boolean
	review: Ref<PublicReviewState>
	collaboration: Ref<CollaborationState | null>
	identified: () => boolean
	mutate(path: string, method: 'PUT', body: unknown): Promise<boolean>
	request(path: string, init?: RequestInit): Promise<Response>
}) {
	const pickedIds = ref<number[]>([])
	const sending = ref(false)
	const sendError = ref('')
	const pending = new Set<number>()
	const status = computed(() => options.review.value.current?.status ?? null)
	const locked = computed(() => options.review.value.enabled && (status.value === 'submitted' || status.value === 'approved'))
	const send = computed(() => pickSendState(pickedIds.value.length, options.review.value))

	const isPicked = (id: number) => pickedIds.value.includes(id)
	function setPicked(id: number, picked: boolean) {
		if (picked === isPicked(id)) return
		pickedIds.value = picked ? [...pickedIds.value, id] : pickedIds.value.filter(value => value !== id)
	}

	async function toggle(item: Pick<MediaItem, 'id'>) {
		if (!options.enabled() || locked.value || pending.has(item.id)) return
		const next = !isPicked(item.id)
		pending.add(item.id)
		setPicked(item.id, next)
		// Omitting the rating keeps any stars the reviewer already gave this photo.
		const saved = await options.mutate(`media/${item.id}/rating`, 'PUT', { pick: next ? 'pick' : 'none' })
		pending.delete(item.id)
		if (!saved) setPicked(item.id, !next)
	}

	function applyState(state: PublicReviewState) {
		options.review.value = state
		if (state.picks) pickedIds.value = state.picks.filter(id => !pending.has(id)).concat(pickedIds.value.filter(id => pending.has(id)))
	}

	async function load() {
		if (!options.enabled() || !options.identified()) return
		try {
			const response = await options.request('review')
			if (response.ok) applyState(await response.json() as PublicReviewState)
		} catch { /* The next identity change or send retries. */ }
	}

	async function sendPicks(message: string): Promise<boolean> {
		if (!send.value.ready || sending.value) return false
		sending.value = true
		sendError.value = ''
		try {
			const response = await options.request('review/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) })
			const payload = await response.json().catch(() => ({})) as PublicReviewState & { message?: string }
			if (!response.ok) throw new Error(payload.message || t('proofing_gallery', 'Your selection could not be sent.'))
			applyState(payload)
			return true
		} catch (exception) {
			sendError.value = exception instanceof Error ? exception.message : String(exception)
			return false
		} finally {
			sending.value = false
		}
	}

	// Picks changed elsewhere (lightbox Pick/Reject, another device) arrive with the collaboration state.
	watch(() => options.collaboration.value?.ratings, ratings => {
		for (const rating of ratings ?? []) if (!pending.has(rating.fileId)) setPicked(rating.fileId, rating.pick === 'pick')
	})
	watch(options.identified, identified => { if (identified) void load() }, { immediate: true })

	return { pickedIds, isPicked, toggle, locked, status, send, sending, sendError, sendPicks, load }
}
