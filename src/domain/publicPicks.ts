import { n, t } from '@nextcloud/l10n'
import type { PublicReviewState } from '../publicTypes.ts'

export interface PickSendState {
	ready: boolean
	/** Short rule summary such as "Choose 2–5", empty without limits. */
	rule: string
	/** Why sending is not possible yet, empty when ready. */
	hint: string
}

// Review rounds limit how many photos a reviewer may send; plain proofing galleries only need one.
export function pickSendState(count: number, review: Pick<PublicReviewState, 'enabled' | 'rules'>): PickSendState {
	const minimum = review.enabled ? Math.max(1, review.rules.minimum) : 1
	const maximum = review.enabled ? review.rules.maximum : 0
	const rule = !review.enabled || (review.rules.minimum <= 1 && maximum === 0)
		? ''
		: maximum > 0
			? t('proofing_gallery', 'Choose {minimum}–{maximum}', { minimum, maximum })
			: t('proofing_gallery', 'Choose at least {minimum}', { minimum })
	if (count < minimum) return { ready: false, rule, hint: count === 0 ? t('proofing_gallery', 'Tap the circle on a photo to select it') : n('proofing_gallery', 'Choose %n more', 'Choose %n more', minimum - count) }
	if (maximum > 0 && count > maximum) return { ready: false, rule, hint: n('proofing_gallery', 'Remove %n photo', 'Remove %n photos', count - maximum) }
	return { ready: true, rule, hint: '' }
}
