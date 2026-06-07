<template>
  <div class="theme-default">
    <DefaultThemeTopbar title="GAK휴먼선운" :items="navItems" />

    <main class="public-content-shell">
      <article class="public-content is-page">

        

		<div class="flex px-6 pt-5 pb-16 gap-8">
			<!-- 왼쪽: 인사말 박스 -->
			<div class="w-1/3 hidden md:block bg-pink-400 text-white justify-start pl-10">
				<h2 class="text-3xl font-bold leading-snug pt-10">
					GFP기회
				</h2>
				<h3 class="text-sm leading-loose pt-10 pr-10 mb-5">
					지에이코리아 휴먼선운지사는<br />
					전문가 및 관리자로<br />
					도약할 수 있는 최고의 회사입니다.
				</h3>
			</div>

			<!-- 오른쪽: 연락처 테이블 -->
			<div class="w-2/3 md:w-2/3 w-full mx-auto px-6 py-10">
				<div>
					<!-- <div class="border-b-2 border-black mb-6"></div> -->

					<!-- 경력 발전 경로 -->
					<div class="relative mb-12">
						<!-- 연결선 -->
						<!-- <div class="absolute top-[60px] left-0 right-0 h-0.5 bg-gray-300 hidden md:block"></div> -->
						
						<!-- 아이템들 -->
						<div class="grid grid-cols-2 md:grid-cols-2 gap-8 md:gap-4">
							<div
								v-for="(item, index) in careerPath"
								:key="index"
								class="flex flex-col items-center text-center relative mb-10">
								
								<!-- 원형 아이콘 -->
								<div 
									class="w-32 h-32 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4 relative z-10"
									:style="{ backgroundColor: item.color }">
									{{ item.title }}
								</div>
								
								<!-- 설명 -->
								<div class="text-sm text-gray-600 leading-relaxed">
									<p v-for="(desc, idx) in item.descriptions" :key="idx">
										{{ desc }}
									</p>
								</div>
							</div>
						</div>
					</div>

					<!-- 하단 메시지 -->
					<div class="text-center space-y-4 mt-16">
						<p class="text-base text-gray-600 leading-relaxed">
							잠을 자는 사람은 꿈을 꾸지만<br>
							깨어 있는 사람은 꿈을 이룰 수 있습니다.
						</p>
						<p class="text-xl text-gray-900 font-bold leading-relaxed">
							지에이코리아 휴먼선운지사와 함께 그 기회를 잡으세요.<br>
							그리고, 그 꿈을 이루시기 바랍니다.
						</p>
					</div>
				</div>
			</div>
		</div>


:::title
title: 체계적인 교육 시스템
subtitle: 휴먼선운지사는 체계적인 금융전문가 지원시스템을 갖추고 있습니다.
align: center
height: medium
textColor: light
buttonText: Get Started
buttonUrl: /start

Use this space for a longer paragraph that describes your offering in more detail. Inline **markdown** is supported.
:::		

		<div class="flex px-6 pt-5 pb-16 gap-8">
			<!-- 왼쪽: 인사말 박스 -->
			<div class="w-1/3 hidden md:block bg-pink-400 text-white justify-start pl-10">
				<h2 class="text-3xl font-bold leading-snug pt-10">
					GFP교육체계
				</h2>
				<h3 class="text-sm leading-loose pt-10 pr-10 mb-5">
					금융전문가는<br />
					무형의 상품을 다루게 됩니다.<br />
그래서 금융업을<br />
인지산업이라고도 합니다.<br />
그만큼 사람과 교육이<br />
중요하다는 의미입니다.<br />
지에이코리아 휴먼선운지사는<br />
사람을 귀하게 여기고<br />
체계적인 지원시스템으로<br />
금융전문가를 지원합니다.<br />
지에이코리아 휴먼선운지사에서<br />
금융전문가의 꿈을 이루십시오.<br />
				</h3>
			</div>

			<!-- 오른쪽: 연락처 테이블 -->
			<div class="w-2/3 md:w-2/3 w-full mx-auto px-6 py-10">
				<!-- 전산지원 -->
				<div>
					<h2 class="text-2xl font-bold text-gray-900 mb-6">전산지원</h2>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
						<div class="p-6 border rounded-lg shadow-sm">
							<h3 class="text-lg font-semibold text-blue-700 mb-3">NERP (자체전산시스템)</h3>
							<ul class="list-disc list-inside text-gray-700 space-y-1">
								<li>교육동영상, 상품자료 지원</li>
								<li>고객관리, 일정관리, 활동관리</li>
								<li>신계약 및 업적관리 등 전반적 업무 지원</li>
							</ul>
						</div>

						<div class="p-6 border rounded-lg shadow-sm">
							<h3 class="text-lg font-semibold text-blue-700 mb-3">모바일 영업지원</h3>
							<ul class="list-disc list-inside text-gray-700 space-y-1">
								<li>인터넷 교육방송 지원(교육과정 동영상, 상품동영상 지원)</li>
								<li>모바일 보장분석</li>
								<li>청약 및 가입설계(일부 제휴사)</li>
							</ul>
						</div>
					</div>
				</div>

				<!-- 교육지원 -->
				<div>
					<h2 class="text-2xl font-bold text-gray-900 mb-6">교육지원</h2>

					<!-- GFP 교육 -->
					<h3 class="text-lg font-semibold text-blue-600 mb-3">- GFP 교육</h3>
					<div class="overflow-x-auto">
						<table class="min-w-full border text-sm text-left mb-8">
							<thead class="bg-gray-100">
								<tr>
									<th class="border px-4 py-2">본사</th>
									<th class="border px-4 py-2">과정명</th>
									<th class="border px-4 py-2">대상</th>
									<th class="border px-4 py-2">교육내용</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td class="border px-4 py-2">지사</td>
									<td class="border px-4 py-2">GFP 입문(등록전 교육)</td>
									<td class="border px-4 py-2">생/손보합격자(신인/경력)</td>
									<td class="border px-4 py-2">Ship, 판매프로세스, 상품이해, 고객관리 등</td>
								</tr>
								<tr>
									<td class="border px-4 py-2">지사</td>
									<td class="border px-4 py-2">정착과정(개발중)</td>
									<td class="border px-4 py-2">등록 4,7차월</td>
									<td class="border px-4 py-2">세일즈맨 Ship, D/B활용법, 택배영업 등</td>
								</tr>
								<tr>
									<td class="border px-4 py-2">본사</td>
									<td class="border px-4 py-2">테마과정(집합/합숙)</td>
									<td class="border px-4 py-2">전 GFP(신청자)</td>
									<td class="border px-4 py-2">판매기법, 신상품 교육, 영업트렌드, 우수사례 공유</td>
								</tr>
								<tr>
									<td class="border px-4 py-2">본사</td>
									<td class="border px-4 py-2">GFP 전략</td>
									<td class="border px-4 py-2">자격충족자</td>
									<td class="border px-4 py-2">보험트렌드, 스토리텔링, 보험과 세금 등</td>
								</tr>
							</tbody>
						</table>
					</div>

					<!-- 관리자/내근 교육 -->
					<h3 class="text-lg font-semibold text-blue-600 mb-3">- 관리자∙내근 교육</h3>
					<div class="overflow-x-auto">
						<table class="min-w-full border text-sm text-left mb-8">
							<thead class="bg-gray-100">
								<tr>
									<th class="border px-4 py-2">과정명</th>
									<th class="border px-4 py-2">대상자</th>
									<th class="border px-4 py-2">교육내용</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="course in managerCourses" :key="course.title">
									<td class="border px-4 py-2 font-semibold">{{ course.title }}</td>
									<td class="border px-4 py-2">{{ course.target }}</td>
									<td class="border px-4 py-2">{{ course.content }}</td>
								</tr>
							</tbody>
						</table>
					</div>

					<!-- 인터넷 교육방송 -->
					<h3 class="text-lg font-semibold text-blue-600 mb-2">- 인터넷 교육방송</h3>
					<ul class="list-disc list-inside text-gray-700 mb-8">
						<li>정규방송, 기획방송 운영</li>
						<li>월간 교육편성표에 따른 운영</li>
						<li>각 제휴사별 상품동영상 운영</li>
					</ul>

					<!-- G-솔루션 -->
					<h3 class="text-lg font-semibold text-blue-600 mb-2">- G-솔루션</h3>
					<p class="text-gray-700 mb-4">
						간편한 입력과 정확한 분석으로 고객이 가입한 보험사별 상품의 보장비교가 가능한 보장분석 시스템입니다.
					</p>
					<img :src="'/Images/interview3_img2.jpg'" class="w-full rounded mb-8" alt="G-솔루션 이미지" />

					<!-- OK마이보험 -->
					<h3 class="text-lg font-semibold text-blue-600 mb-2">- OK마이보험</h3>
					<p class="text-gray-700 mb-4">
						스마트폰 어플로 간단하게 고객의 보장자산을 확인하고 현장에서 고객과의 활동을 지원하는 TOOL입니다.
					</p>
					<img :src="'/Images/interview3_img3.jpg'" class="w-full rounded mb-8" alt="OK마이보험 이미지" />
				</div>

				<!-- 영업지원 -->
				<div>
					<h2 class="text-2xl font-bold text-gray-900 mb-6">영업지원</h2>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
						<div class="p-6 border rounded-lg">
							<h3 class="text-lg font-semibold text-blue-700 mb-2">G-솔루션</h3>
							<p class="text-blue-600 font-semibold mb-1">G솔루션이란?</p>
							<p class="text-gray-700">간편한 입력과 정확한 분석으로 보험사별 상품비교가 가능하여 다양한 솔루션을 제공해주는 보장분석 시스템입니다.</p>
						</div>

						<div class="p-6 border rounded-lg">
							<h3 class="text-lg font-semibold text-blue-700 mb-2">OK마이보험</h3>
							<p class="text-blue-600 font-semibold mb-1">OK마이보험이란?</p>
							<p class="text-gray-700">스마트폰 어플로 고객의 보장자산을 확인하고 현장에서 지원하는 Tool입니다.</p>
						</div>
					</div>

					<!-- 링크 섹션 -->
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div class="bg-blue-700 text-white text-center py-6 rounded-lg font-semibold">상품 비교 · 분석 시스템</div>
						<a href="/notice/notice6" class="bg-pink-600 text-white text-center py-6 rounded-lg font-semibold hover:bg-pink-700 transition">
							행복플러스 (사외보)
						</a>
						<div class="bg-blue-700 text-white text-center py-6 rounded-lg font-semibold">GAK 전용상품</div>
					</div>
				</div>
			</div>
		</div>

:::title
title: 효율적인 지원제도
subtitle: 휴먼선운지사는 삶의 가치를 실현하는 최고의 보상체계를 갖추고 있습니다.
align: center
height: medium
textColor: light
buttonText: Get Started
buttonUrl: /start

Use this space for a longer paragraph that describes your offering in more detail. Inline **markdown** is supported.
:::				

		<div class="flex px-6 pt-5 pb-16 gap-8">
			<!-- 왼쪽: 인사말 박스 -->
			<div class="w-1/3 hidden md:block bg-pink-400 text-white justify-start pl-10">
				<h2 class="text-3xl font-bold leading-snug pt-10">
					GFP지원제도
				</h2>
				<h3 class="text-sm leading-loose pt-10 pr-10 mb-5">
직업이 꿈이었던 시절이 있었습니다.<br />
의사, 판사, 변호사 등의 전문직이<br />
마치 꿈의 종착지 인 듯<br />
대부분의 전문가들이 고객들을 위해서는 <br />
사후적인 일에 집중합니다.<br />
하지만 재무설계사는 고객을 위해 <br />
사전적으로 봉사합니다.<br />
고객의 현재를 진단하여 <br />
위험을 제거하고 <br />
대비하며 고객의 꿈을 이루어줍니다.<br />
지에이코리아 휴먼선운지사에서<br />
그 가치를 실현하십시요.<br />
				</h3>
			</div>

			<!-- 오른쪽: 연락처 테이블 -->
			<div class="w-2/3 md:w-2/3 w-full mx-auto px-6 py-10">

				<!-- 메인 문구 -->
				<p class="text-center text-2xl md:text-3xl font-semibold text-gray-900 leading-relaxed my-1">
					GA업계 1위의 Know-how와 혁신적인 수수료 시스템은 <br class="hidden md:block">
					<span class="text-pink-600">GFP(설계사)</span>가 가장 먼저 만족하고 있습니다.
				</p>

				<!-- 원형 강조 4개 -->
				<div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center mb-20">
					<div
						v-for="(item, i) in circleItems"
						:key="i"
						class="flex flex-col items-center justify-center bg-pink-200 text-gray-500 rounded-full w-48 h-48 mx-auto shadow-lg"
					>
						<!-- <div class="text-4xl mb-2"><i :class="item.icon"></i></div> -->
						<p class="text-sm whitespace-pre-line">{{ item.top }}</p>
						<p class="text-2xl font-bold mt-1">{{ item.bottom }}</p>
					</div>
				</div>

				<!-- 수수료 항목 -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
					<div
						v-for="item in commissionList"
						:key="item.title"
						class="border border-gray-200 rounded-lg shadow-sm p-6 bg-gray-50"
					>
						<h3 class="text-lg font-semibold text-blue-700 mb-3">{{ item.title }}</h3>
						<ul class="list-disc list-inside text-gray-700 space-y-1">
							<li v-for="(line, i) in item.contents" :key="i" v-html="line"></li>
						</ul>
					</div>
				</div>

				<!-- 복지 항목 -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-10">
					<div
						v-for="item in welfareList"
						:key="item.title"
						class="border border-gray-200 rounded-lg shadow-sm p-6 bg-white"
					>
						<h3 class="text-lg font-semibold text-blue-700 mb-3">{{ item.title }}</h3>
						<ul class="list-disc list-inside text-gray-700 space-y-1">
							<li v-for="(line, i) in item.contents" :key="i" v-html="line"></li>
						</ul>
					</div>
				</div>
			</div>
		</div>







      </article>
    </main>

    <DefaultThemeFooter :columns="footerColumns" imprint="© 2026 GAK휴먼선운" />
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import DefaultThemeFooter from '~/components/public/DefaultThemeFooter.vue'
import InsureLocationBlock from '~/components/blocks/insurance/InsureLocationBlock.vue'

definePageMeta({ layout: 'default' })

const navItems = useSiteNav('header')
const footerColumns = useSiteFooterColumns()

const careerPath = [
  {
    title: 'GFP(설계사)',
    color: '#3b82f6',
    descriptions: [
      '- 재무설계서비스',
      '- 생보, 손보 보험상품판매'
    ]
  },
  {
    title: '전문가',
    color: '#8b5cf6',
    descriptions: [
      '- 고객 맞춤형 종합 재무설계 제공',
      '- 다양한 금융상품 판매'
    ]
  },
  {
    title: '관리자',
    color: '#ec4899',
    descriptions: [
      '- 사회적 존경 욕구 실현',
      '- 관리자 발탁'
    ]
  },
  {
    title: '자아실현',
    color: '#f59e0b',
    descriptions: [
      '- 베푸는 삶',
      '- 봉사하는 삶'
    ]
  }
];

const managerCourses = [
  { title: '신규지사장', target: '신규지사장', content: '당사 제규정, 지사경영 관련 제반 업무, Q&A 등' },
  { title: '경력지사장', target: '지사장 중 신청자', content: '영업정보, 금융환경, 업계 트렌드 이해, 우수사례 공유 등' },
  { title: '신규사업부장', target: '신규사업부장', content: '본사 각 팀별 업무이해, 기관장 실전업무' },
  { title: '총무역량강화', target: '총무', content: 'OA(엑셀, 워드, PPT 등), 고객응대, 재무회계, 영업일반 등' },
]

const circleItems = [
  { top: '유지율과 실적별\n단서조항이', bottom: '없다', icon: "fa-solid fa-up-long" },
  { top: '익월 수수료가', bottom: '높다', icon: "fa-solid fa-up-long" },
  { top: '수수료 지급기간이', bottom: '짧다', icon: "fa-solid fa-up-long" },
  { top: '수수료 체계가', bottom: '단순하다', icon: "fa-solid fa-up-long" },
]

const commissionList = [
  {
    title: '생명보험 수수료',
    contents: ['<strong class="text-gray-900">A, B, C Type</strong> 의 기본수수료 선택 가능'],
  },
  {
    title: '손해보험 수수료',
    contents: [
      '<strong class="text-gray-900">A, B, C Type</strong> 의 기본수수료 선택 가능',
      '<strong class="text-gray-900">일시납 / 일반보험 / 자동차보험</strong>',
    ],
  },
]

const welfareList = [
  {
    title: '복지 수수료',
    contents: [
      '<strong class="text-gray-900">보너스 수수료</strong> (연 2회, 설날·추석 지급)',
      '<strong class="text-gray-900">고능률 우대 수수료</strong> (월별 업적 달성 시 매월 지급)',
    ],
  },
  {
    title: 'GFP 복지제도',
    contents: ['<strong class="text-gray-900">장례용품 지원 서비스</strong> (전 GFP 대상)'],
  },
]

const mediaMap = {}
</script>

<style scoped>
.public-content-shell {
  padding: 40px 24px 80px;
  max-width: 1200px;
  margin: 0 auto;
}

.public-content {
  max-width: 880px;
  margin: 0 auto;
}
</style>
