<template>
  <div class="block-renderer">
    <component
      v-for="(block, i) in blocks"
      :key="i"
      :is="resolve(block.type)"
      :block="block"
      :media-map="mediaMap"
    />
  </div>
</template>

<script setup lang="ts">
import { shallowRef, type Component } from 'vue'
import NoticeBlock from './NoticeBlock.vue'
import TitleBlock from './TitleBlock.vue'
import TextBlock from './TextBlock.vue'
import HighlightBlock from './HighlightBlock.vue'
import QuoteBlock from './QuoteBlock.vue'
import ButtonBlock from './ButtonBlock.vue'
import YoutubeBlock from './YoutubeBlock.vue'
import GalleryBlock from './GalleryBlock.vue'
import ImageGridBlock from './ImageGridBlock.vue'
import SlideBlock from './SlideBlock.vue'
import FileBlock from './FileBlock.vue'
import MapBlock from './MapBlock.vue'
import TimelineBlock from './TimelineBlock.vue'
import RowBlock from './RowBlock.vue'
import TextCardBlock from './TextCardBlock.vue'
import HeroCardsBlock from './HeroCardsBlock.vue'
import IconListBlock from './IconListBlock.vue'
import MediaTextBlock from './MediaTextBlock.vue'
import TabsBlock from './TabsBlock.vue'
import PostListBlock from './PostListBlock.vue'
import ImageBlock from './ImageBlock.vue'
import InsuranceCalculatorBlock from './insurance/InsuranceCalculatorBlock.vue'
import InsurancePlanningBlock from './insurance/InsurancePlanning.vue'

type BlockNode = { type: string; props: Record<string, unknown> }
type MediaInfo = { paths?: { original?: string }; title?: string; alt?: string }

defineProps<{
  blocks: BlockNode[]
  /**
   * id → media info. The host page (or BlockRenderer wrapper) is responsible
   * for fetching media docs for any imageIds referenced by gallery/imageGrid/slide
   * blocks and passing them in. Non-image blocks ignore this prop.
   */
  mediaMap?: Record<string, MediaInfo>
}>()

const registry: Record<string, Component> = {
  text: TextBlock,
  notice: NoticeBlock,
  title: TitleBlock,
  highlight: HighlightBlock,
  quote: QuoteBlock,
  button: ButtonBlock,
  youtube: YoutubeBlock,
  gallery: GalleryBlock,
  imageGrid: ImageGridBlock,
  slide: SlideBlock,
  file: FileBlock,
  map: MapBlock,
  timeline: TimelineBlock,
  row: RowBlock,
  textCard: TextCardBlock,
  heroCards: HeroCardsBlock,
  iconList: IconListBlock,
  mediaText: MediaTextBlock,
  tabs: TabsBlock,
  postList: PostListBlock,
  image: ImageBlock,
  // ── insure 전용 ──
  insuranceCalculator: InsuranceCalculatorBlock,
  insurancePlanning:   InsurancePlanningBlock,
}

const fallback = shallowRef(TextBlock)

function resolve(type: string): Component {
  return registry[type] ?? fallback.value
}
</script>
