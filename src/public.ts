import { loadState } from '@nextcloud/initial-state'
import { IonicVue } from '@ionic/vue'
import { createApp } from 'vue'
import '@ionic/vue/css/core.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'
import '@ionic/vue/css/palettes/dark.system.css'
import '@ionic/vue/css/palettes/dark.class.css'
import '@fontsource-variable/geist/wght.css'
import '@fontsource-variable/manrope/wght.css'
import '@fontsource-variable/newsreader/wght.css'
import './public-shell.css'

import type { GallerySettings } from './domain/gallerySettings'
import type { PublicGalleryPage, PublicReviewState } from './publicTypes.ts'
import { applyPublicLocale } from './publicLocale.ts'

interface PublicGalleryState {
	id: number
	title: string
	token: string
	deliveryMode: 'standard' | 'event'
	path: string
	settings: GallerySettings
	initialPage: PublicGalleryPage
	review?: PublicReviewState
	viewer?: { displayName: string; email: string | null } | null
}

const state = loadState<PublicGalleryState>('proofing_gallery', 'public-gallery')

async function mount() {
	// Load the coordinator and locale together; the server's loader stays up meanwhile.
	const [{ default: PublicApp }] = await Promise.all([
		import('./PublicApp.vue'),
		state.settings.publicLocale === 'auto' ? Promise.resolve() : applyPublicLocale(state.settings.publicLocale),
	])
	document.body.classList.add('proofing-gallery-public-page')
	document.documentElement.classList.add('proofing-gallery-public-page')
	document.title = state.title
	const app = createApp(PublicApp, { gallery: state })
	app.use(IonicVue)
	const root = document.querySelector<HTMLElement>('#proofing_gallery_public')!
	app.mount(root)
	await Promise.race([firstScreenReady(root), new Promise(resolve => setTimeout(resolve, 8000))])
}

function hideLoader() {
	const loader = document.querySelector<HTMLElement>('#proofing-gallery-loader')
	if (!loader) return
	loader.style.opacity = '0'
	setTimeout(() => loader.remove(), 400)
}

/**
 * Resolves once fonts and the images on the first screen have loaded, so the
 * gallery appears whole instead of assembling itself in front of the guest.
 *
 * @param root Element the public app is mounted in.
 */
async function firstScreenReady(root: HTMLElement): Promise<void> {
	let images: HTMLImageElement[] = []
	// The grid renders its tiles after measuring itself, so give it a moment to place them.
	for (let attempt = 0; attempt < 15 && !images.length; attempt++) {
		await new Promise(resolve => setTimeout(resolve, 100))
		images = [...root.querySelectorAll('img')].filter(image => {
			const box = image.getBoundingClientRect()
			return box.width > 0 && box.bottom > 0 && box.top < window.innerHeight
		})
	}
	await Promise.all([
		document.fonts?.ready,
		...images.filter(image => !image.complete).map(image => new Promise(resolve => {
			image.addEventListener('load', resolve, { once: true })
			image.addEventListener('error', resolve, { once: true })
		})),
	])
}

mount().finally(hideLoader)
