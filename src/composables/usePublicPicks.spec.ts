import { defineComponent, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { usePublicPicks } from './usePublicPicks.ts'
import type { CollaborationState, PublicReviewState } from '../publicTypes.ts'

function review(overrides: Partial<PublicReviewState> = {}): PublicReviewState {
	return { enabled: true, dueDate: null, rules: { minimum: 1, maximum: 0 }, progress: null, current: { round: 1, status: 'awaiting_feedback', dueDate: null, submittedAt: null, decidedAt: null, updatedAt: 0 }, ...overrides }
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

function harness(options: { mutate?: () => Promise<boolean>; request?: (path: string) => Promise<Response>; identified?: boolean; state?: PublicReviewState } = {}) {
	const reviewState = ref(options.state ?? review())
	const collaboration = ref<CollaborationState | null>(null)
	const identified = ref(options.identified ?? true)
	const mutate = vi.fn(options.mutate ?? (async () => true))
	const request = vi.fn(options.request ?? (async () => json(review({ picks: [7, 8] }))))
	let picks!: ReturnType<typeof usePublicPicks>
	const wrapper = mount(defineComponent({
		setup() {
			picks = usePublicPicks({ enabled: () => true, review: reviewState, collaboration, identified: () => identified.value, mutate, request })
			return () => null
		},
	}))
	return { picks, reviewState, collaboration, identified, mutate, request, wrapper }
}
const flush = () => new Promise(resolve => setTimeout(resolve))

describe('reviewer picks', () => {
	it('loads the saved picks once the reviewer is identified', async () => {
		const { picks, identified, request, wrapper } = harness({ identified: false })
		expect(request).not.toHaveBeenCalled()
		identified.value = true
		await nextTick(); await flush()
		expect(request).toHaveBeenCalledWith('review')
		expect(picks.pickedIds.value).toEqual([7, 8])
		wrapper.unmount()
	})

	it('toggles optimistically and sends only the pick state', async () => {
		const { picks, mutate, wrapper } = harness({ request: async () => json(review({ picks: [] })) })
		await flush()
		await picks.toggle({ id: 3 })
		expect(mutate).toHaveBeenCalledWith('media/3/rating', 'PUT', { pick: 'pick' })
		expect(picks.isPicked(3)).toBe(true)
		await picks.toggle({ id: 3 })
		expect(mutate).toHaveBeenLastCalledWith('media/3/rating', 'PUT', { pick: 'none' })
		expect(picks.isPicked(3)).toBe(false)
		wrapper.unmount()
	})

	it('reverts a pick the server rejected', async () => {
		const { picks, wrapper } = harness({ mutate: async () => false, request: async () => json(review({ picks: [] })) })
		await flush()
		await picks.toggle({ id: 4 })
		expect(picks.isPicked(4)).toBe(false)
		wrapper.unmount()
	})

	it('follows picks changed in the lightbox', async () => {
		const { picks, collaboration, wrapper } = harness({ request: async () => json(review({ picks: [1] })) })
		await flush()
		collaboration.value = { ratings: [{ fileId: 1, rating: 0, pick: 'reject', updatedAt: 1 }, { fileId: 2, rating: 3, pick: 'pick', updatedAt: 1 }] } as unknown as CollaborationState
		await nextTick()
		expect(picks.pickedIds.value).toEqual([2])
		wrapper.unmount()
	})

	it('locks the selection after sending a review round', async () => {
		const submitted = review({ picks: [1, 2], current: { round: 1, status: 'submitted', dueDate: null, submittedAt: 1, decidedAt: null, updatedAt: 1 } })
		const { picks, reviewState, request, mutate, wrapper } = harness({ request: async path => json(path === 'review/send' ? submitted : review({ picks: [1, 2] })) })
		await flush()
		expect(await picks.sendPicks('Thanks')).toBe(true)
		expect(request).toHaveBeenLastCalledWith('review/send', expect.objectContaining({ method: 'POST', body: JSON.stringify({ message: 'Thanks' }) }))
		expect(reviewState.value.current?.status).toBe('submitted')
		expect(picks.locked.value).toBe(true)
		await picks.toggle({ id: 5 })
		expect(mutate).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it('reports why sending failed', async () => {
		const { picks, wrapper } = harness({ request: async path => path === 'review/send' ? json({ message: 'The selection deadline has passed' }, 422) : json(review({ picks: [1] })) })
		await flush()
		expect(await picks.sendPicks('')).toBe(false)
		expect(picks.sendError.value).toBe('The selection deadline has passed')
		wrapper.unmount()
	})
})
