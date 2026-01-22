<template>
  <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" @click.self="closeModal">
    <div class="relative bg-white rounded-lg p-6 max-w-xl max-h-[90vh] overflow-y-auto w-full border border-gray-200">
      <h3 class="text-xl font-bold mb-4 text-primary-dark">미처리 영수증 현황 (정산신청/보류)</h3>
      <div v-if="Object.keys(summaryData).length > 0">
        <ul class="space-y-2">
          <li v-for="(amount, email) in summaryData" :key="email" class="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-100">
            <span class="font-semibold text-gray-700">{{ email.split('@')[0] }}</span>
            <span class="text-lg font-bold text-primary">{{ amount.toLocaleString() }}원</span>
          </li>
        </ul>
        <div class="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center font-bold text-xl">
          <span class="text-gray-700">총 미처리 금액:</span>
          <span class="text-red-600">{{ totalSummaryAmount.toLocaleString() }}원</span>
        </div>
      </div>
      <p v-else class="text-gray-600">미처리된 영수증이 없습니다.</p>
      <button
          @click="closeModal"
          class="absolute top-4 right-4 text-gray-700 text-3xl bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-200 transition-colors"
          aria-label="모달 닫기"
      ><i class="fa-solid fa-times text-base"></i></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  summaryData: Record<string, number>;
}>();

const emit = defineEmits(['close']);

// 요약된 금액의 총합 계산
const totalSummaryAmount = computed(() => {
  return Object.values(props.summaryData).reduce((sum, amount) => sum + amount, 0);
});

const closeModal = () => {
  emit('close');
};
</script>
