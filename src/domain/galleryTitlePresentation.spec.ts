import { describe, expect, it } from 'vitest'
import { effectiveGalleryTitleMode, publicHeroQuery } from './galleryTitlePresentation.ts'

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

describe('public hero query', () => {
	it('asks for the whole photo behind a full-screen cover', () => {
		expect(publicHeroQuery({ heroFileId: 7, openerStyle: 'fullscreen' })).toBe('?v=7&x=2400&y=2400&mode=fit')
	})

	it('keeps the cropped banner for other openings', () => {
		expect(publicHeroQuery({ heroFileId: 7, openerStyle: 'cinematic' })).toBe('?v=7')
	})
})
