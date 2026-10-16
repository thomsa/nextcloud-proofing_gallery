<script setup lang="ts">
import { IonNote, IonTitle, IonToolbar } from '@ionic/vue'
import { n, t } from '@nextcloud/l10n'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

import type { GallerySettings } from '../domain/gallerySettings.ts'
import { effectiveGalleryTitleMode } from '../domain/galleryTitlePresentation.ts'

const props = defineProps<{
	title: string
	total: number
	settings: GallerySettings
	heroUrl?: string | null
	totalLabel?: string
}>()
const emit = defineEmits<{
	/** True while a full-screen cover is still behind the page header. */
	overlay: [active: boolean]
	'scroll-down': []
}>()
const titleMode = computed(() => effectiveGalleryTitleMode(props.settings.presentation))
const fullscreen = computed(() => props.settings.presentation.openerStyle === 'fullscreen')
const overlay = computed(() => fullscreen.value || titleMode.value === 'overlay')
// A minimal opening has no cover height of its own; an overlay title needs one.
const heroSize = computed(() => fullscreen.value ? 'fullscreen' : props.settings.presentation.openerStyle === 'minimal' ? 'compact' : props.settings.presentation.openerStyle)
const heroEnd = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | undefined

watch(fullscreen, async active => {
	observer?.disconnect()
	emit('overlay', active)
	await nextTick()
	if (!active || !heroEnd.value || typeof IntersectionObserver === 'undefined') return
	observer = new IntersectionObserver(entries => emit('overlay', entries.some(entry => entry.isIntersecting)))
	observer.observe(heroEnd.value)
}, { immediate: true })
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
	<div class="gallery-opener"
		:class="[
			`gallery-opener--${settings.presentation.openerStyle}`,
			`gallery-opener--align-${settings.presentation.titleAlignment}`,
		]">
		<section v-if="overlay"
			class="gallery-opener__hero"
			:class="[`gallery-opener__hero--${heroSize}`, { 'gallery-opener__hero--backdrop': !heroUrl }]">
			<img v-if="heroUrl"
				class="gallery-opener__hero-image"
				:src="heroUrl"
				alt=""
				:style="{ objectPosition: `${settings.presentation.heroFocusX}% ${settings.presentation.heroFocusY}%` }">
			<div class="gallery-opener__overlay">
				<h1 v-if="titleMode === 'overlay'"
					class="gallery-opener__overlay-title"
					:class="[`gallery-opener__title--${settings.presentation.fontPreset}`, `gallery-opener__title--${settings.presentation.titleSize}`]">
					{{ title }}
				</h1>
				<p v-if="settings.presentation.showMediaCount && !fullscreen" class="gallery-opener__overlay-count">
					{{ totalLabel ?? n('proofing_gallery', '%n photo', '%n photos', total) }}
				</p>
				<p v-if="settings.presentation.welcomeMessage" class="gallery-opener__overlay-welcome">
					{{ settings.presentation.welcomeMessage }}
				</p>
			</div>
			<div v-if="fullscreen" class="gallery-opener__bottom">
				<p v-if="settings.presentation.showMediaCount" class="gallery-opener__overlay-count">
					{{ totalLabel ?? n('proofing_gallery', '%n photo', '%n photos', total) }}
				</p>
				<button type="button"
					class="gallery-opener__scroll"
					@click="emit('scroll-down')">
					<span>{{ t('proofing_gallery', 'Scroll down') }}</span>
					<svg viewBox="0 0 24 24"
						width="18"
						height="18"
						aria-hidden="true"><path d="M12 4v15m0 0-6-6m6 6 6-6"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round" /></svg>
				</button>
			</div>
			<span v-if="fullscreen" ref="heroEnd" class="gallery-opener__hero-end" />
		</section>
		<template v-else>
			<IonToolbar v-if="titleMode === 'large'" class="gallery-opener__title-toolbar">
				<IonTitle size="large"
					class="gallery-opener__large-title"
					:class="[
						`gallery-opener__title--${settings.presentation.fontPreset}`,
						`gallery-opener__title--${settings.presentation.titleSize}`,
					]">
					<h1>{{ title }}</h1>
				</IonTitle>
			</IonToolbar>
			<img v-if="heroUrl && settings.presentation.openerStyle !== 'minimal'"
				class="gallery-opener__cover"
				:class="`gallery-opener__cover--${settings.presentation.openerStyle}`"
				:src="heroUrl"
				alt=""
				:style="{ objectPosition: `${settings.presentation.heroFocusX}% ${settings.presentation.heroFocusY}%` }">
			<div v-if="settings.presentation.showMediaCount || settings.presentation.welcomeMessage" class="gallery-opener__meta ion-padding-horizontal">
				<IonNote v-if="settings.presentation.showMediaCount">
					{{ totalLabel ?? n('proofing_gallery', '%n photo', '%n photos', total) }}
				</IonNote>
				<p v-if="settings.presentation.welcomeMessage">
					{{ settings.presentation.welcomeMessage }}
				</p>
			</div>
		</template>
	</div>
</template>

<style scoped>
.gallery-opener { background: var(--ion-background-color); }

.gallery-opener__title-toolbar { --background: var(--ion-background-color); --border-width: 0; --min-height: auto; --padding-start: 0; --padding-end: 0; }

.gallery-opener__large-title { position: relative; width: 100%; margin: 0; padding: 18px 16px 8px; color: var(--ion-text-color); font-size: clamp(30px, 6vw, 40px); font-weight: 700; letter-spacing: -.035em; line-height: 1.08; text-align: start; }

.gallery-opener__large-title h1 { margin: 0; color: inherit; font: inherit; letter-spacing: inherit; line-height: inherit; }

.gallery-opener__title--large { font-size: clamp(38px, 8vw, 58px); }

.gallery-opener--align-center .gallery-opener__large-title,
.gallery-opener--align-center .gallery-opener__meta { text-align: center; }

.gallery-opener--align-center .gallery-opener__meta p { margin-inline: auto; }

.gallery-opener__cover { display: block; width: 100%; object-fit: cover; }

.gallery-opener__cover--compact { height: clamp(140px, 24vw, 260px); }

.gallery-opener__cover--cinematic { height: clamp(240px, 42vw, 520px); }

.gallery-opener__meta { display: grid; gap: 6px; padding-block: 10px 14px; }

.gallery-opener__meta p { max-width: 70ch; margin: 0; color: var(--ion-text-color); font-size: 15px; line-height: 1.45; white-space: pre-line; }

.gallery-opener__title--modern { font-family: "Geist Variable", sans-serif; }

.gallery-opener__title--editorial { font-family: NewsreaderVariable, serif; }

.gallery-opener__title--system { font-family: system-ui, sans-serif; }

/* Overlay title: the cover image darkened, with white text centered on it. */
.gallery-opener__hero { position: relative; display: grid; overflow: hidden; place-items: center; color: #fff; isolation: isolate; }

.gallery-opener__hero--compact { min-height: clamp(220px, 32vw, 340px); }

.gallery-opener__hero--cinematic { min-height: clamp(300px, 46vw, 560px); }

/* Fills the screen and slides under the page header, which turns transparent meanwhile. */
.gallery-opener__hero--fullscreen { min-height: max(420px, 100svh); margin-top: calc(var(--offset-top, 0px) * -1); }

.gallery-opener__hero--backdrop { background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--gallery-accent) 42%, #121212), #0d0d0d 78%); }

.gallery-opener__hero-image { position: absolute; z-index: -2; inset: 0; width: 100%; height: 100%; object-fit: cover; }

.gallery-opener__hero::after { position: absolute; z-index: -1; inset: 0; background: linear-gradient(rgb(0 0 0 / 42%), rgb(0 0 0 / 52%)); content: ''; }

.gallery-opener__overlay { display: grid; justify-items: center; gap: 10px; max-width: min(90vw, 900px); padding: 72px 24px; text-align: center; text-shadow: 0 1px 12px rgb(0 0 0 / 35%); }

.gallery-opener__overlay-title { margin: 0; color: #fff; font-size: clamp(34px, 7vw, 56px); font-weight: 700; letter-spacing: -.03em; line-height: 1.05; overflow-wrap: anywhere; }

.gallery-opener__overlay-title.gallery-opener__title--large { font-size: clamp(42px, 10vw, 84px); }

.gallery-opener__overlay-count { margin: 0; color: rgb(255 255 255 / 86%); font-size: 13px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; }

.gallery-opener__overlay-welcome { max-width: 60ch; margin: 4px 0 0; color: rgb(255 255 255 / 92%); font-size: 16px; line-height: 1.5; white-space: pre-line; }

/* Photo count and Scroll down button, pinned to the bottom of the full-screen cover. */
.gallery-opener__bottom { position: absolute; inset: auto 0 max(28px, calc(env(safe-area-inset-bottom) + 20px)); display: grid; justify-items: center; gap: 12px; text-shadow: 0 1px 12px rgb(0 0 0 / 35%); }

.gallery-opener__scroll {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	min-height: 44px;
	padding: 0 18px 0 20px;
	border: 1.5px solid rgb(255 255 255 / 85%);
	border-radius: 999px;
	background: rgb(0 0 0 / 18%);
	color: #fff;
	font: inherit;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
	backdrop-filter: blur(4px);
}

.gallery-opener__scroll:hover,
.gallery-opener__scroll:focus-visible { background: rgb(255 255 255 / 16%); }

.gallery-opener__scroll svg { animation: gallery-opener-nudge 1.6s ease-in-out infinite; }

@keyframes gallery-opener-nudge {
	0%, 100% { transform: translateY(-2px); }
	50% { transform: translateY(4px); }
}

/* Marks where the cover stops sitting behind the header. */
.gallery-opener__hero-end { position: absolute; inset: auto 0 72px; height: 1px; pointer-events: none; }

@media (prefers-reduced-motion: reduce) {
	.gallery-opener__scroll svg { animation: none; }
}

@media (min-width: 768px) {
	.gallery-opener__large-title { padding: 28px 24px 10px; }

	.gallery-opener__meta { padding-inline: 24px; }
}
</style>
