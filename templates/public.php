<?php

declare(strict_types=1);
?>
<?php /* Styled inline so it covers the page from the first frame, before the app's CSS arrives; public.ts removes it once the first screen is ready. */ ?>
<div id="proofing-gallery-loader" aria-hidden="true" style="position: fixed; z-index: 10000; inset: 0; display: grid; place-items: center; background: #101214; transition: opacity .35s ease;">
	<span style="width: 36px; height: 36px; box-sizing: border-box; border: 3px solid rgb(255 255 255 / 18%); border-top-color: rgb(255 255 255 / 85%); border-radius: 50%; animation: proofing-gallery-spin .8s linear infinite;"></span>
</div>
<style>
	@keyframes proofing-gallery-spin { to { transform: rotate(360deg); } }
	/* #content is fixed, so it is its own stacking context; lift it over the Nextcloud header and footer while loading. */
	body:has(#proofing-gallery-loader) #content { z-index: 10000; }
</style>
<div id="proofing_gallery_public"></div>
