<template>
  <div class="theme-backend-user-modal" @click="$emit('close')">
    <div class="block-sample-modal" @click.stop>
      <header class="theme-backend-user-drawer-head">
        <strong>Sample · {{ sample?.label || type }}</strong>
        <button type="button" class="theme-backend-close" aria-label="Close" @click="$emit('close')">×</button>
      </header>

      <div v-if="!sample" class="block-sample-empty">
        <p>이 block 타입에는 아직 sample이 등록되지 않았습니다: <code>{{ type }}</code></p>
      </div>

      <div v-else class="block-sample-body">
        <div class="block-sample-preview">
          <BlockRenderer :blocks="[sample.block]" :media-map="sample.mediaMap || {}" />
        </div>

        <details class="block-sample-source">
          <summary>Markdown source</summary>
          <pre>{{ sample.markdown }}</pre>
        </details>
      </div>

      <footer v-if="sample" class="theme-backend-actions block-sample-foot">
        <button
          type="button"
          class="theme-form-submit theme-form-submit-secondary-soft"
          @click="$emit('close')"
        >닫기</button>
        <button
          type="button"
          class="theme-form-submit"
          @click="$emit('insert', sample.markdown)"
        >이 sample 삽입</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BlockRenderer from '~/components/blocks/BlockRenderer.vue'
import { BLOCK_SAMPLES } from '~/components/admin/blockSamples'

const props = defineProps<{ type: string }>()
defineEmits<{ close: []; insert: [markdown: string] }>()

const sample = computed(() => BLOCK_SAMPLES[props.type])
</script>
