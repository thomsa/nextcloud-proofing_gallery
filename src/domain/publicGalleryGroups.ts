import { t } from '@nextcloud/l10n'

// Label for a grid group header when the public gallery is grouped.
export function groupLabel(group: string | undefined): string {
	if (group === 'image') return t('proofing_gallery', 'Images')
	if (group === 'video') return t('proofing_gallery', 'Videos')
	if (group === 'root') return t('proofing_gallery', 'Main folder')
	return group || t('proofing_gallery', 'Other')
}
