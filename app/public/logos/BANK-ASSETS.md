# Bank logo sources

Use locally stored, unchanged bank artwork to identify directory entries. Every new bank entry must include a logo and a source record here. Listing a bank or its logo does not establish an implemented integration, bank endorsement or approval for Peer payments.

These assets were retrieved unchanged on October 2, 2026 from icon links in the banks' official public homepages:

| Local file | Official homepage | Asset URL |
| --- | --- | --- |
| `chase.jpg` | https://www.chase.com/ | https://www.chase.com/etc/designs/chase-ux/favicon-152.png |
| `bank-of-america.png` | https://www.bankofamerica.com/ | https://www.bankofamerica.com/homepage/spa-assets/images/assets-images-global-favicon-android-chrome-192x192-CSXafb7d716.png |
| `wells-fargo.png` | https://www.wellsfargo.com/ | https://www17.wellsfargomedia.com/assets/images/icons/icon-hires_192x192.png |

China and Singapore assets were retrieved unchanged on October 5, 2026. Standard Chartered and Trust Bank publish a square icon of at least 128 px on their homepages. The other banks' homepages only serve 16 to 48 px favicons, so their icons come from each bank's own Apple App Store listing (seller verified through the App Store lookup API), served by Apple at 128 × 128:

| Local file | Official source | Asset URL |
| --- | --- | --- |
| `icbc.png` | [ICBC App Store listing](https://apps.apple.com/cn/app/id423514795), seller Industrial and Commercial Bank of China | https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/c9/6e/49/c96e4981-d3a9-f9d0-cff5-4d36135fdc3b/AppIcon-0-0-1x_U007ephone-0-1-0-0-sRGB-85-220.png/128x128bb.png |
| `ccb.png` | [CCB App Store listing](https://apps.apple.com/cn/app/id391965015), seller China Construction Bank | https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/40/31/4c/40314c85-48eb-3376-cd85-2a5cd85c2fae/AppIcon-0-0-1x_U007ephone-0-1-0-sRGB-85-220.png/128x128bb.png |
| `abc.png` | [ABC App Store listing](https://apps.apple.com/cn/app/id515651240), seller Agricultural Bank of China Limited | https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/14/1f/68/141f68e4-112d-40de-0e7a-d1c188d0ce41/AppIcon-Release-1x_U007emarketing-0-6-0-sRGB-85-220-0.png/128x128bb.png |
| `boc.png` | [BOC App Store listing](https://apps.apple.com/cn/app/id399608199), seller Bank of China Limited | https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/a9/81/13/a981130c-a9d3-1ed8-1828-95d986c0e116/AppIcon-1x_U007emarketing-0-8-0-sRGB-85-220-0.png/128x128bb.png |
| `cmb.png` | [CMB App Store listing](https://apps.apple.com/cn/app/id392899425), seller China Merchants Bank Co., Ltd. | https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/06/de/de/06dedefb-0618-e2ad-b262-35a0a6ede3f4/AppIcon26-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/128x128bb.png |
| `dbs.png` | [DBS digibank App Store listing](https://apps.apple.com/sg/app/id1068403826), seller DBS Bank Ltd | https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/13/14/57/131457ac-988b-3b5d-cf2e-6bdc4428cdb8/AppIcon-0-0-1x_U007emarketing-0-11-0-sRGB-85-220.png/128x128bb.png |
| `ocbc.png` | [OCBC Singapore App Store listing](https://apps.apple.com/sg/app/id292506828), seller Oversea-Chinese Banking Corporation Limited | https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/6c/d8/65/6cd8655f-2fee-8d61-7bd7-62b05fef11b1/AppIcon-0-0-1x_U007ephone-0-11-0-sRGB-85-220.png/128x128bb.png |
| `uob.png` | [UOB TMRW App Store listing](https://apps.apple.com/sg/app/id1049286296), seller United Overseas Bank Limited | https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/c9/03/b3/c903b35f-2ee9-9282-87fc-3d4941ae5475/AppIcon-0-0-1x_U007emarketing-0-7-0-85-220.png/128x128bb.png |
| `standard-chartered.png` | https://www.sc.com/sg/ | https://av.sc.com/sg/content/images/content/images/cropped-cropped-favicon-cropped-512x512-1-200x200.png |
| `trust.png` | https://trustbank.sg/ | https://trustbank.sg/images/trust_favicon.png |

Other bank logos predate this source register and are preserved from the existing repository; this file does not claim to have reverified their provenance. Peer wordmarks are documented separately in [PEER-ASSETS.md](PEER-ASSETS.md).

Chase serves JPEG bytes at its `.png` icon URL; the local `.jpg` extension matches the unchanged response format.
