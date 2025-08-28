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

        <div class="flex items-center text-sm text-gray-700 whitespace-nowrap">
          <label :for="'processed-' + expense.id"
                 :class="[
              'p-2 rounded-lg transition duration-200 ease-in-out',
              // 본인 항목일 때 (조작 가능)
              {
                'bg-gray-200 cursor-pointer hover:bg-gray-300': expense.userId === authStore.currentUserUid && !expense.isProcessed,
                '!bg-lime-500 !text-white hover:!bg-lime-600': expense.userId === authStore.currentUserUid && expense.isProcessed,
              },
              // 타인 항목일 때 (조작 불가능)
              {
                'bg-gray-200 cursor-default': expense.userId !== authStore.currentUserUid && !expense.isProcessed,
                '!bg-lime-500 !text-white cursor-default': expense.userId !== authStore.currentUserUid && expense.isProcessed,
              }
            ]"
          >
            <input
                type="checkbox"
                :id="'processed-' + expense.id"
                :checked="expense.isProcessed"
                @change="toggleProcessedStatus"
                class="mr-1 transform scale-110"
                :class="{'cursor-pointer': expense.userId === authStore.currentUserUid}"
                :disabled="expense.userId !== authStore.currentUserUid"
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
      <div v-if="expense.thumbnailUrl || expense.originalImageUrl"
           class="w-[150px] h-[150px] flex-shrink-0 border border-gray-300 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
        <img :src="expense.thumbnailUrl || expense.originalImageUrl"
             alt="영수증 이미지"
             class="max-w-full max-h-full object-contain cursor-pointer hover:opacity-80 transition-opacity"
             @click="openImageModal(expense.originalImageUrl)">
      </div>

      <pre
          class="m-0 p-3 bg-gray-100 rounded-md flex-grow max-w-full sm:max-w-[calc(100%-150px-1rem)] whitespace-pre-wrap break-words text-sm text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors duration-200 ease-in-out"
          @click="openDescriptionModal(expense.description)"
      >
        {{ expense.description.length > 150 ? expense.description.substring(0, 150) + '...' : expense.description }}
      </pre>
    </div>
  </li>

  <div v-if="isImageModalOpen"
       class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
       @click.self="closeImageModal">
    <div class="relative max-w-5xl max-h-[90vh]"> <img :src="currentImageUrl" alt="전체화면 영수증 이미지" class="max-w-full max-h-[90vh] object-contain">
      <button
          @click="closeImageModal"
          class="absolute top-4 right-4 text-white text-4xl bg-gray-800 bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-colors"
          aria-label="모달 닫기"
      >&times;</button>
    </div>
  </div>

  <div v-if="isDescriptionModalOpen"
       class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
       @click.self="closeDescriptionModal">
    <div class="relative bg-white rounded-lg p-6 max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
      <h3 class="text-xl font-bold mb-4">영수증 상세 내용</h3>
      <pre class="whitespace-pre-wrap break-words text-base text-gray-800">{{ currentDescription }}</pre>
      <button
          @click="closeDescriptionModal"
          class="absolute top-4 right-4 text-gray-700 text-3xl bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-300 transition-colors"
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
import type { Expense } from '../types/Expense';

const props = defineProps<{
  expense: Expense;
}>();

const authStore = useAuthStore();
const expenseStore = useExpenseStore();

const isImageModalOpen = ref(false);
const currentImageUrl = ref('');

const isDescriptionModalOpen = ref(false);
const currentDescription = ref('');

const formatDateToYYMMDD = (timestamp: Timestamp | undefined) => {
  if (!timestamp) return '날짜 없음';
  const date = timestamp.toDate();
  return date.toISOString().slice(0, 10);
};

const editAmountField = async (expenseId: string, currentAmount: number) => {
  if (props.expense.userId !== authStore.currentUserUid) return;
  const newAmountStr = window.prompt(`금액을 수정하세요: (현재: ${currentAmount.toLocaleString()}원)`, String(currentAmount));
  if (newAmountStr !== null && newAmountStr.trim() !== '') {
    await expenseStore.updateExpenseField(expenseId, 'amount', newAmountStr);
  } else if (newAmountStr === '') {
    alert('금액을 입력하지 않았습니다. 수정이 취소됩니다.');
  }
};

const editDateField = async (expenseId: string, currentDate: string) => {
  if (props.expense.userId !== authStore.currentUserUid) return;
  const newDateStr = window.prompt(`날짜를 수정하세요: (현재: ${currentDate})\n형식:YYYY-MM-DD`, currentDate);
  if (newDateStr !== null && newDateStr.trim() !== '') {
    await expenseStore.updateExpenseField(expenseId, 'date', newDateStr);
  } else if (newDateStr === '') {
    alert('날짜를 입력하지 않았습니다. 수정이 취소됩니다.');
  }
};

const toggleProcessedStatus = async () => {
  if (props.expense.userId !== authStore.currentUserUid) return;
  await expenseStore.toggleExpenseProcessedStatus(props.expense.id!, props.expense.isProcessed);
};

const confirmDelete = async () => {
  if (props.expense.userId !== authStore.currentUserUid) return;
  if (confirm('이 지출 내역과 연결된 이미지를 정말로 삭제하시겠습니까?')) {
    await expenseStore.deleteExpense(props.expense.id!);
  }
};

const openImageModal = (imageUrl: string | undefined) => {
  if (imageUrl) {
    currentImageUrl.value = imageUrl;
    isImageModalOpen.value = true;
  }
};

const closeImageModal = () => {
  isImageModalOpen.value = false;
  currentImageUrl.value = '';
};

const openDescriptionModal = (description: string) => {
  currentDescription.value = description;
  isDescriptionModalOpen.value = true;
};

const closeDescriptionModal = () => {
  isDescriptionModalOpen.value = false;
  currentDescription.value = '';
};
</script>
