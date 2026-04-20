export enum CmsSectionType {
  HERO = 'HERO',
  PRODUCT_CAROUSEL = 'PRODUCT_CAROUSEL',
  CATEGORY_GRID = 'CATEGORY_GRID',
  BANNER = 'BANNER',
  /** Featured level-1 collections: blocks optional; web may load from categories API. */
  FEATURED_COLLECTIONS = 'FEATURED_COLLECTIONS',
  /** Editorial story: maps to BrandStorySection + BRAND_STORY block. */
  STORY_CHAPTER = 'STORY_CHAPTER',
  /** Three-image lookbook mosaic: maps to LookbookGrid + LOOKBOOK block. */
  LOOKBOOK_MOSAIC = 'LOOKBOOK_MOSAIC',
  /** First active block among VIDEO | QUOTE | RICH_TEXT defines the moment. */
  EDITORIAL = 'EDITORIAL',
  /** Shop-the-look image + hotspots (HOTSPOTS block). */
  SHOP_THE_LOOK = 'SHOP_THE_LOOK',
  /** Editorial journal row (JOURNAL_LIST block). */
  JOURNAL_ROW = 'JOURNAL_ROW',
  /** Logo / press strip (MARQUEE_LOGOS block). */
  PRESS_MARQUEE = 'PRESS_MARQUEE',
}

export enum CmsBlockType {
  BANNER = 'BANNER',
  PRODUCT = 'PRODUCT',
  CATEGORY = 'CATEGORY',
  HTML = 'HTML',
  /** Brand story chapter: image + two lines of copy (see BrandStorySection). */
  BRAND_STORY = 'BRAND_STORY',
  /** Exactly three images with alt text (see LookbookGrid). */
  LOOKBOOK = 'LOOKBOOK',
  VIDEO = 'VIDEO',
  QUOTE = 'QUOTE',
  RICH_TEXT = 'RICH_TEXT',
  /** Image with normalized hotspot coordinates + product links. */
  HOTSPOTS = 'HOTSPOTS',
  /** Journal cards row. */
  JOURNAL_LIST = 'JOURNAL_LIST',
  /** Partner / press logos strip. */
  MARQUEE_LOGOS = 'MARQUEE_LOGOS',
}
