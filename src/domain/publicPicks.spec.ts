import { describe, expect, it } from 'vitest'
import { pickSendState } from './publicPicks.ts'

const round = (minimum: number, maximum: number) => ({ enabled: true, rules: { minimum, maximum } })

describe('pick send rules', () => {
	it('needs one photo without a review round', () => {
		expect(pickSendState(0, { enabled: false, rules: { minimum: 5, maximum: 2 } })).toMatchObject({ ready: false, rule: '' })
		expect(pickSendState(1, { enabled: false, rules: { minimum: 5, maximum: 2 } })).toEqual({ ready: true, rule: '', hint: '' })
	})

	it('enforces the round minimum and maximum', () => {
		expect(pickSendState(1, round(2, 5))).toMatchObject({ ready: false, rule: 'Choose 2–5', hint: 'Choose 1 more' })
		expect(pickSendState(3, round(2, 5))).toEqual({ ready: true, rule: 'Choose 2–5', hint: '' })
		expect(pickSendState(7, round(2, 5))).toMatchObject({ ready: false, hint: 'Remove 2 photos' })
	})

	it('describes open-ended rounds', () => {
		expect(pickSendState(3, round(3, 0))).toEqual({ ready: true, rule: 'Choose at least 3', hint: '' })
		expect(pickSendState(2, round(0, 0))).toEqual({ ready: true, rule: '', hint: '' })
	})
})
