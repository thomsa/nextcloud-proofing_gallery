<script setup lang="ts">
/* eslint-disable vue/no-deprecated-slot-attribute -- Ionic Vue maps Web Component slots through the slot attribute. */
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonTitle, IonToolbar } from '@ionic/vue'
import { n, t } from '@nextcloud/l10n'
import { closeOutline } from 'ionicons/icons'
import { computed, ref } from 'vue'
import type { PickSendState } from '../domain/publicPicks.ts'
import type { PublicReviewState } from '../publicTypes.ts'

const props = defineProps<{
	pickedIds: number[]
	send: PickSendState
	review: PublicReviewState
	sending: boolean
	error: string
	mobile: boolean
	previewUrl(id: number): string
	submit(message: string): Promise<boolean>
}>()
const emit = defineEmits<{ remove: [id: number] }>()

const open = ref(false)
const sent = ref(false)
const message = ref('')
const count = computed(() => props.pickedIds.length)
const reviewEnabled = computed(() => props.review.enabled)
const status = computed(() => reviewEnabled.value ? props.review.current?.status ?? null : null)
const dueDate = computed(() => reviewEnabled.value ? props.review.dueDate : null)
const locked = computed(() => status.value === 'submitted' || status.value === 'approved')
const visible = computed(() => count.value > 0 || reviewEnabled.value)
const sendLabel = computed(() => reviewEnabled.value ? t('proofing_gallery', 'Send for review') : t('proofing_gallery', 'Send selection'))
const headline = computed(() => {
	if (status.value === 'submitted') return t('proofing_gallery', 'Selection sent')
	if (status.value === 'approved') return t('proofing_gallery', 'Selection approved')
	return count.value === 0 ? t('proofing_gallery', 'No photos selected') : n('proofing_gallery', '%n photo selected', '%n photos selected', count.value)
})
const detail = computed(() => {
	if (status.value === 'submitted') return t('proofing_gallery', 'Waiting for the photographer')
	if (status.value === 'approved') return ''
	const parts = [status.value === 'changes_requested' ? t('proofing_gallery', 'Changes requested') : '', props.send.ready ? props.send.rule : props.send.hint]
	if (dueDate.value) parts.push(t('proofing_gallery', 'Due {date}', { date: dueDate.value }))
	return parts.filter(Boolean).join(' · ')
})

function openSheet() {
	sent.value = false
	open.value = true
}

async function confirm() {
	if (await props.submit(message.value)) {
		message.value = ''
		sent.value = true
	}
}
</script>

<template>
	<aside v-if="visible"
		class="pick-bar"
		:data-status="status ?? 'open'"
		:aria-label="t('proofing_gallery', 'Your selection')">
		<button type="button"
			class="pick-bar__summary"
			:disabled="count === 0"
			@click="openSheet">
			<strong>{{ headline }}</strong>
			<span v-if="detail">{{ detail }}</span>
		</button>
		<button v-if="!locked"
			type="button"
			class="pick-bar__send"
			:disabled="count === 0"
			@click="openSheet">
			{{ sendLabel }}
		</button>
	</aside>

	<IonModal :is-open="open"
		class="proofing-public-overlay pick-sheet"
		:initial-breakpoint="mobile ? 0.9 : 1"
		:breakpoints="mobile ? [0, 0.9, 1] : [0, 1]"
		:handle="mobile"
		@did-dismiss="open = false">
		<IonHeader>
			<IonToolbar>
				<IonTitle>{{ sent ? t('proofing_gallery', 'Selection sent') : t('proofing_gallery', 'Your selection') }}</IonTitle>
				<IonButtons slot="end">
					<IonButton :aria-label="t('proofing_gallery', 'Close')" @click="open = false">
						<IonIcon slot="icon-only" :icon="closeOutline" />
					</IonButton>
				</IonButtons>
			</IonToolbar>
		</IonHeader>
		<IonContent class="ion-padding">
			<p v-if="sent" class="pick-sheet__done">
				{{ reviewEnabled ? t('proofing_gallery', 'Thank you. The photographer will review your selection and get back to you.') : t('proofing_gallery', 'Thank you. The photographer has received your selection.') }}
			</p>
			<template v-else>
				<p class="pick-sheet__summary">
					<strong>{{ n('proofing_gallery', '%n photo selected', '%n photos selected', count) }}</strong>
					<span v-if="send.rule">{{ send.rule }}</span>
					<span v-if="dueDate">{{ t('proofing_gallery', 'Due {date}', { date: dueDate }) }}</span>
				</p>
				<ul class="pick-sheet__photos" :aria-label="t('proofing_gallery', 'Selected photos')">
					<li v-for="id in pickedIds" :key="id">
						<img :src="previewUrl(id)" alt="" loading="lazy">
						<button v-if="!locked"
							type="button"
							:aria-label="t('proofing_gallery', 'Remove from selection')"
							@click="emit('remove', id)">
							×
						</button>
					</li>
				</ul>
				<label v-if="!locked" class="pick-sheet__message">
					<span>{{ t('proofing_gallery', 'Message to the photographer (optional)') }}</span>
					<textarea v-model="message" rows="3" maxlength="2000" />
				</label>
				<p v-if="!send.ready && send.hint" class="pick-sheet__hint" role="status">
					{{ send.hint }}
				</p>
				<p v-if="error" class="pick-sheet__error" role="alert">
					{{ error }}
				</p>
				<button v-if="!locked"
					type="button"
					class="pick-bar__send pick-sheet__confirm"
					:disabled="!send.ready || sending"
					@click="confirm">
					{{ sending ? t('proofing_gallery', 'Sending…') : sendLabel }}
				</button>
			</template>
		</IonContent>
	</IonModal>
</template>

<style scoped>
.pick-bar {
	position: fixed;
	z-index: 20;
	inset: auto 12px max(12px, env(safe-area-inset-bottom));
	display: flex;
	align-items: center;
	gap: 12px;
	max-width: 760px;
	margin-inline: auto;
	padding: 8px 8px 8px 16px;
	border: 1px solid var(--gallery-border);
	border-radius: 999px;
	background: var(--gallery-surface);
	color: var(--gallery-text);
	box-shadow: 0 6px 24px rgb(0 0 0 / 18%);
}

.pick-bar__summary {
	display: grid;
	flex: 1;
	min-width: 0;
	padding: 2px 0;
	border: 0;
	background: transparent;
	color: inherit;
	text-align: start;
	cursor: pointer;
}

.pick-bar__summary:disabled { cursor: default; }

.pick-bar__summary strong { font-size: 15px; }

.pick-bar__summary span {
	overflow: hidden;
	color: var(--gallery-muted);
	font-size: 12px;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.pick-bar__send {
	min-height: 44px;
	padding: 0 20px;
	border: 0;
	border-radius: 999px;
	background: var(--gallery-accent);
	color: var(--ion-color-primary-contrast, #fff);
	font-weight: 650;
	white-space: nowrap;
	cursor: pointer;
}

.pick-bar__send:disabled { opacity: .45; cursor: default; }

.pick-sheet { --width: min(calc(100% - 32px), 720px); --height: min(86dvh, 760px); --border-radius: 16px; }

.pick-sheet__summary { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: baseline; margin: 0 0 12px; }

.pick-sheet__summary span,
.pick-sheet__hint { color: var(--gallery-muted, #666); }

.pick-sheet__photos {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
	gap: 8px;
	margin: 0 0 16px;
	padding: 0;
	list-style: none;
}

.pick-sheet__photos li { position: relative; aspect-ratio: 1; overflow: hidden; border-radius: 6px; background: rgb(127 127 127 / 15%); }

.pick-sheet__photos img { width: 100%; height: 100%; object-fit: cover; }

.pick-sheet__photos button {
	position: absolute;
	inset: 4px 4px auto auto;
	width: 28px;
	height: 28px;
	border: 0;
	border-radius: 50%;
	background: rgb(0 0 0 / 70%);
	color: #fff;
	font-size: 18px;
	line-height: 1;
	cursor: pointer;
}

.pick-sheet__message { display: grid; gap: 6px; margin-bottom: 12px; }

.pick-sheet__message span { font-size: 13px; }

.pick-sheet__message textarea { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid rgb(127 127 127 / 45%); border-radius: 8px; font: inherit; resize: vertical; }

.pick-sheet__error { color: #c62828; }

.pick-sheet__confirm { width: 100%; }

.pick-sheet__done { font-size: 16px; line-height: 1.5; }

@media (max-width: 520px) {
	.pick-bar { inset-inline: 8px; padding-inline-start: 14px; }
	.pick-bar__send { padding: 0 14px; }
	.pick-sheet { --width: 100%; --border-radius: 18px 18px 0 0; }
}
</style>
