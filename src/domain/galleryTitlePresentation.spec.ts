import { describe, expect, it } from 'vitest'
import { effectiveGalleryTitleMode } from './galleryTitlePresentation.ts'

describe('effective gallery title mode', () => {
	it('centers the title over a full-screen cover', () => {
		expect(effectiveGalleryTitleMode({ titleMode: 'large', openerStyle: 'fullscreen' })).toBe('overlay')
		expect(effectiveGalleryTitleMode({ titleMode: 'compact', openerStyle: 'fullscreen' })).toBe('overlay')
	})

	it('keeps hidden titles and other openings unchanged', () => {
		expect(effectiveGalleryTitleMode({ titleMode: 'hidden', openerStyle: 'fullscreen' })).toBe('hidden')
		expect(effectiveGalleryTitleMode({ titleMode: 'large', openerStyle: 'cinematic' })).toBe('large')
		expect(effectiveGalleryTitleMode({ titleMode: 'overlay', openerStyle: 'compact' })).toBe('overlay')
	})
})
