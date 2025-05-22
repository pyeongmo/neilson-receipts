<template>
  <li :class="['list-none p-5 md:p-6 mb-8 rounded-xl shadow-lg bg-white text-left max-w-xl mx-auto', { 'bg-green-50': expense.isProcessed }]">
    <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
      <h3 class="flex-grow text-lg font-semibold whitespace-nowrap overflow-hidden text-ellipsis pr-3">
        <span
            @click="editDateField(expense.id!, formatDateToYYMMDD(expense.date))"
            class="cursor-pointer underline decoration-dotted text-blue-600 hover:text-blue-800"
            v-if="expense.userId === authStore.currentUserUid"
        >
          {{ formatDateToYYMMDD(expense.date) }}
        </span>
        <span v-else>
          {{ formatDateToYYMMDD(expense.date) }}
        </span>
        <span class="mx-1">|</span>
        <span
            @click="editAmountField(expense.id!, expense.amount)"
            class="cursor-pointer underline decoration-dotted text-blue-600 hover:text-blue-800"
            v-if="expense.userId === authStore.currentUserUid"
        >
          {{ expense.amount ? expense.amount.toLocaleString() : '0' }}원
        </span>
        <span v-else>
          {{ expense.amount ? expense.amount.toLocaleString() : '0' }}원
        </span>
      </h3>
      <div class="flex items-center justify-end gap-3 flex-wrap">
        <small class="text-gray-600 whitespace-nowrap text-sm">{{ expense.uploaderEmail?.split('@')[0] || expense.userId }}</small>
        <div v-if="expense.userId === authStore.currentUserUid" class="flex items-center text-sm text-gray-700 whitespace-nowrap">
          <label :for="'processed-' + expense.id" class="p-2 rounded-lg bg-gray-200 cursor-pointer transition duration-200 ease-in-out hover:bg-gray-300"
                 :class="{'!bg-lime-500 !text-white hover:!bg-lime-600': expense.isProcessed}">
            <input
                type="checkbox"
                :id="'processed-' + expense.id"
                :checked="expense.isProcessed"
                @change="toggleProcessedStatus"
                class="mr-1 transform scale-110 cursor-pointer"
            />
            완료
          </label>
        </div>
        <button v-if="expense.userId === authStore.currentUserUid" @click="confirmDelete" class="bg-red-500 text-white border-none px-3 py-2 rounded-lg cursor-pointer text-sm flex items-center whitespace-nowrap transition duration-200 ease-in-out hover:bg-red-600">
          <i class="fas fa-trash mr-1"></i> 삭제
        </button>
      </div>
    </div>
    <div class="flex flex-col sm:flex-row items-center sm:items-start gap-4">
      <img v-if="expense.originalImageUrl"
           :src="expense.originalImageUrl"
           alt="영수증 이미지"
           class="max-w-[150px] h-auto border border-gray-300 rounded-md flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
           @click="openModal(expense.originalImageUrl)">
      <pre class="m-0 p-3 overflow-auto max-h-[300px] bg-gray-100 rounded-md flex-grow max-w-full sm:max-w-[calc(100%-150px-1rem)] whitespace-pre-wrap break-words text-sm text-gray-700">
        {{ expense.description }}
      </pre>
    </div>
  </li>

  <div v-if="isModalOpen"
       class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
       @click.self="closeModal">
    <div class="relative max-w-5xl max-h-full">
      <img :src="currentImageUrl" alt="전체화면 영수증 이미지" class="max-w-full max-h-full object-contain">
      <button
          @click="closeModal"
          class="absolute top-4 right-4 text-white text-4xl bg-gray-800 bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-colors"
          aria-label="모달 닫기"
      >&times;</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { useExpenseStore } from '../stores/expenseStore';
import { Timestamp } from 'firebase/firestore';
import type { Expense } from '../types/Expense'; // Expense 타입 임포트

// Props 정의
const props = defineProps<{
  expense: Expense;
}>();

// Pinia 스토어
const authStore = useAuthStore();
const expenseStore = useExpenseStore();

// 모달 관련 상태
const isModalOpen = ref(false);
const currentImageUrl = ref('');

// 영수증 날짜 포맷팅 함수
const formatDateToYYMMDD = (timestamp: Timestamp | undefined) => {
  if (!timestamp) return '날짜 없음';
  const date = timestamp.toDate();
  return date.toISOString().slice(0, 10);
};

// 금액 수정
const editAmountField = async (expenseId: string, currentAmount: number) => {
  const newAmountStr = window.prompt(`금액을 수정하세요: (현재: ${currentAmount.toLocaleString()}원)`, String(currentAmount));
  if (newAmountStr !== null && newAmountStr.trim() !== '') {
    await expenseStore.updateExpenseField(expenseId, 'amount', newAmountStr);
  } else if (newAmountStr === '') {
    alert('금액을 입력하지 않았습니다. 수정이 취소됩니다.');
  }
};

// 날짜 수정
const editDateField = async (expenseId: string, currentDate: string) => {
  const newDateStr = window.prompt(`날짜를 수정하세요: (현재: ${currentDate})\n형식:YYYY-MM-DD`, currentDate);
  if (newDateStr !== null && newDateStr.trim() !== '') {
    await expenseStore.updateExpenseField(expenseId, 'date', newDateStr);
  } else if (newDateStr === '') {
    alert('날짜를 입력하지 않았습니다. 수정이 취소됩니다.');
  }
};

// 처리 완료 상태 토글
const toggleProcessedStatus = async () => {
  await expenseStore.toggleExpenseProcessedStatus(props.expense.id!, props.expense.isProcessed);
};

// 지출 내역 삭제 확인
const confirmDelete = async () => {
  if (confirm('이 지출 내역과 연결된 이미지를 정말로 삭제하시겠습니까?')) {
    await expenseStore.deleteExpense(props.expense.id!);
  }
};

// 모달 열기
const openModal = (imageUrl: string | undefined) => {
  if (imageUrl) {
    currentImageUrl.value = imageUrl;
    isModalOpen.value = true;
  }
};

// 모달 닫기
const closeModal = () => {
  isModalOpen.value = false;
  currentImageUrl.value = '';
};
</script>
