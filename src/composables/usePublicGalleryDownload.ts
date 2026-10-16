import { t } from '@nextcloud/l10n'
import { ref } from 'vue'

type GalleryDownloadStatus = { available: boolean, reason: 'empty' | 'too_many_files' | 'too_large' | 'index_incomplete' | null, fileCount: number, totalBytes: number, maxFiles: number, maxBytes: number }

// Checks the complete-gallery archive limits before starting the download.
export function usePublicGalleryDownload(options: {
	endpoint(path: string): string
	start(url: string): Promise<void>
	closePanel(): void
}) {
	const galleryDownloadBusy = ref(false)
	const galleryDownloadError = ref('')

	async function downloadEntireGallery() {
		options.closePanel()
		galleryDownloadError.value = ''
		galleryDownloadBusy.value = true
		try {
			const response = await fetch(options.endpoint('download/gallery/status'), { headers: { Accept: 'application/json' } })
			if (!response.ok) throw new Error()
			const status = await response.json() as GalleryDownloadStatus
			if (!status.available) {
				galleryDownloadError.value = status.reason === 'too_many_files'
					? t('proofing_gallery', 'This gallery contains more than {limit} downloadable files.', { limit: status.maxFiles })
					: status.reason === 'too_large'
						? t('proofing_gallery', 'This gallery is larger than the configured download limit.')
						: status.reason === 'index_incomplete'
							? t('proofing_gallery', 'This gallery is still being prepared. Try the download again later.')
							: t('proofing_gallery', 'This gallery does not contain downloadable files.')
				return
			}
			await options.start(options.endpoint('download/gallery'))
		} catch {
			galleryDownloadError.value = t('proofing_gallery', 'The gallery download could not be prepared.')
		} finally {
			galleryDownloadBusy.value = false
		}
	}

	return { galleryDownloadBusy, galleryDownloadError, downloadEntireGallery }
}
