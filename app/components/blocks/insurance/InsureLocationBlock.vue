<template>
  <div class="location-wrap">
    <!-- 왼쪽: 인사말 박스 -->
    <div class="location-intro">
      <h2>{{ title }}</h2>
      <h3 v-if="subtitleLines.length">
        <template v-for="(line, i) in subtitleLines" :key="i">
          <span v-html="line"></span><br v-if="i < subtitleLines.length - 1">
        </template>
      </h3>
    </div>

    <!-- 오른쪽: 연락처 테이블 -->
    <div class="location-detail">
      <div class="location-divider"></div>
      <div class="location-list">
        <div class="location-item" v-if="address">
          <span class="loc-label">주소</span>
          <span class="loc-value">{{ address }}</span>
        </div>
        <div class="location-item" v-if="phone">
          <span class="loc-label">대표번호</span>
          <span class="loc-value loc-phone">{{ phone }}</span>
        </div>
        <div class="location-item" v-if="fax">
          <span class="loc-label">팩스</span>
          <span class="loc-value">{{ fax }}</span>
        </div>
        <div class="location-item" v-if="directions.length">
          <span class="loc-label">오시는 길</span>
          <div class="loc-value">
            <p v-for="(line, i) in directions" :key="i">{{ line }}</p>
          </div>
        </div>
      </div>
      <img
        v-if="mapImageId && mediaMap?.[mapImageId]"
        :src="(mediaMap[mapImageId] as any)?.paths?.original"
        alt="오시는 길 지도"
        class="location-map"
      >
    </div>
  </div>
</template>

<script setup lang="ts">
type MediaInfo = { paths?: { original?: string }; title?: string; alt?: string }

const props = defineProps<{
  block: {
    props: {
      title?: string
      subtitle?: string
      address?: string
      phone?: string
      fax?: string
      directions?: string
      mapImageId?: string
    }
  }
  mediaMap?: Record<string, MediaInfo>
}>()

const title      = computed(() => props.block.props?.title || '위치 및 연락처')
const address    = computed(() => props.block.props?.address || '')
const phone      = computed(() => props.block.props?.phone || '')
const fax        = computed(() => props.block.props?.fax || '')
const mapImageId = computed(() => props.block.props?.mapImageId || '')

const subtitleLines = computed(() => {
  const raw = props.block.props?.subtitle || ''
  return raw ? raw.split('|').map((s: string) => s.trim()).filter(Boolean) : []
})

const directions = computed(() => {
  const raw = props.block.props?.directions || ''
  return raw ? raw.split('|').map((s: string) => s.trim()).filter(Boolean) : []
})
</script>

<style>
.location-wrap {
  display: flex;
  gap: 2rem;
  padding: 4rem 1.5rem;
}

.location-intro {
  width: 33%;
  flex-shrink: 0;
  background-color: #f472b6;
  color: white;
  padding: 2.5rem 1rem 2.5rem 2.5rem;
}

.location-intro h2 {
  font-size: 1.875rem;
  font-weight: 700;
  line-height: 1.4;
  margin: 0 0 2.5rem 0;
}

.location-intro h3 {
  font-size: 1.125rem;
  line-height: 2;
  margin: 0;
  padding-right: 2.5rem;
}

.location-detail {
  flex: 1;
}

.location-divider {
  border-top: 2px solid #111;
  margin-bottom: 1.5rem;
}

.location-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  font-size: 1rem;
  color: #1f2937;
}

.location-item {
  display: flex;
  align-items: flex-start;
}

.loc-label {
  width: 6rem;
  flex-shrink: 0;
  font-weight: 600;
}

.loc-value {
  color: #4b5563;
}

.loc-value p {
  margin: 0 0 0.25rem 0;
}

.loc-phone {
  color: #EE5085;
  font-weight: 700;
}

.location-map {
  width: 100%;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.15);
  margin-top: 2.5rem;
}

@media (max-width: 768px) {
  .location-wrap {
    flex-direction: column;
  }
  .location-intro {
    width: 100%;
  }
}
</style>
