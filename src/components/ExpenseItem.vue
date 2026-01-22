<template>
  <li :class="['list-none p-4 md:p-6 mb-6 rounded-xl bg-white text-left max-w-2xl mx-auto border border-gray-200 shadow-sm transition-all relative overflow-hidden', { 'bg-primary/5 border-primary/20': expense.status === '수령확인', 'opacity-70 pointer-events-none': isUpdating }]">
    <!-- 로딩 오버레이 -->
    <div v-if="isUpdating" class="absolute inset-0 bg-white/40 flex items-center justify-center z-10 backdrop-blur-[1px]">
      <div class="flex flex-col items-center gap-2">
        <i class="fa-solid fa-circle-notch animate-spin text-primary text-2xl"></i>
      </div>
    </div>

    <!-- 상단 정보 영역: 날짜, 금액, 작성자, 상태 -->
    <div class="flex flex-col gap-3 mb-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg md:text-xl font-bold flex items-center gap-2">
          <span
              @click="editDateField(expense.id!, formatDateToYYMMDD(expense.date))"
              class="cursor-pointer underline decoration-dotted text-primary hover:text-primary-dark transition-colors"
              v-if="expense.userId === authStore.currentUserUid || authStore.isAdmin"
          >
            {{ formatDateToYYMMDD(expense.date) }}
          </span>
          <span v-else>{{ formatDateToYYMMDD(expense.date) }}</span>

          <span class="text-gray-300">|</span>

          <span
              @click="editAmountField(expense.id!, expense.amount)"
              class="cursor-pointer underline decoration-dotted text-primary hover:text-primary-dark transition-colors"
              v-if="expense.userId === authStore.currentUserUid || authStore.isAdmin"
          >
            {{ expense.amount ? expense.amount.toLocaleString() : '0' }}원
          </span>
          <span v-else>{{ expense.amount ? expense.amount.toLocaleString() : '0' }}원</span>
        </h3>

        <div
            :class="[
              'px-2 py-1 rounded-md text-xs font-bold border',
              expense.status === '수령확인' ? 'bg-primary text-white border-primary' :
              expense.status === '이체완료' ? 'bg-blue-100 text-blue-700 border-blue-200' :
              expense.status === '보류' ? 'bg-orange-100 text-orange-700 border-orange-200' :
              'bg-amber-100 text-amber-700 border-amber-200'
            ]"
        >
          {{ expense.status }}
        </div>
      </div>

      <div class="flex items-center justify-between text-sm text-gray-500">
        <div class="flex items-center gap-1">
          <i class="fa-regular fa-user text-xs"></i>
          <span>{{ expense.uploaderEmail?.split('@')[0] || expense.userId }}</span>
        </div>
      </div>
    </div>

    <!-- 버튼 영역: 모바일에서 더 접근하기 편하도록 분리 -->
    <div v-if="expense.userId === authStore.currentUserUid || authStore.isAdmin" class="flex flex-wrap gap-2 mb-4 p-2 bg-gray-50 rounded-lg border border-gray-100">
      <template v-if="expense.status === '정산신청'">
        <button @click="updateStatus('이체완료')" class="flex-1 min-w-[80px] px-3 py-1.5 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors text-xs font-bold flex items-center justify-center gap-1">
          <i class="fa-solid fa-paper-plane text-[10px]"></i>
          <span>이체완료</span>
        </button>
        <button @click="updateStatus('보류')" class="px-3 py-1.5 rounded-md bg-white border border-gray-300 text-gray-500 hover:bg-gray-100 transition-colors text-xs font-medium flex items-center justify-center gap-1">
          <i class="fa-solid fa-pause text-[10px]"></i>
          <span>보류</span>
        </button>
      </template>
      <template v-else-if="expense.status === '보류'">
        <button @click="updateStatus('정산신청')" class="flex-1 px-3 py-1.5 rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors text-xs font-bold flex items-center justify-center gap-1">
          <i class="fa-solid fa-redo text-[10px]"></i>
          <span>정산신청</span>
        </button>
      </template>
      <template v-else-if="expense.status === '이체완료'">
        <button v-if="expense.userId === authStore.currentUserUid" @click="updateStatus('수령확인')" class="flex-1 px-3 py-1.5 rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors text-xs font-bold flex items-center justify-center gap-1">
          <i class="fa-solid fa-check-double text-[10px]"></i>
          <span>수령확인</span>
        </button>
        <button @click="updateStatus('정산신청')" class="px-3 py-1.5 rounded-md bg-white border border-gray-300 text-gray-500 hover:bg-gray-100 transition-colors text-xs font-medium flex items-center justify-center gap-1">
          <i class="fa-solid fa-redo text-[10px]"></i>
          <span>정산신청</span>
        </button>
      </template>
      <template v-else-if="expense.status === '수령확인'">
        <button v-if="expense.userId === authStore.currentUserUid" @click="updateStatus('이체완료')" class="flex-1 px-3 py-1.5 rounded-md bg-white border border-gray-300 text-gray-500 hover:bg-gray-100 transition-colors text-xs font-medium flex items-center justify-center gap-1">
          <i class="fa-solid fa-redo text-[10px]"></i>
          <span>이체완료</span>
        </button>
      </template>

      <button
          v-if="(expense.userId === authStore.currentUserUid && expense.status === '정산신청') || authStore.isAdmin"
          @click="confirmDelete"
          class="px-3 py-1.5 rounded-md bg-white border border-red-200 text-red-500 hover:bg-red-50 transition-colors text-xs font-medium flex items-center justify-center gap-1"
          title="삭제"
      >
        <i class="fa-solid fa-trash text-[10px]"></i>
        <span>삭제</span>
      </button>
    </div>

    <!-- 하단 영역: 이미지 및 설명 -->
    <div class="flex flex-col sm:flex-row gap-4">
      <div v-if="expense.thumbnailUrl || expense.originalImageUrl"
           class="w-full sm:w-[120px] md:w-[150px] aspect-square flex-shrink-0 border border-gray-100 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
        <img :src="expense.thumbnailUrl || expense.originalImageUrl"
             alt="영수증 이미지"
             class="max-w-full max-h-full object-contain cursor-pointer hover:scale-105 transition-transform duration-200"
             @click="openImageModal(expense.originalImageUrl)">
      </div>

      <div class="flex-grow min-w-0">
        <pre
            class="m-0 p-3 bg-gray-50 rounded-lg h-full whitespace-pre-wrap break-words text-sm text-gray-700 cursor-pointer hover:bg-gray-100 border border-gray-100 transition-colors"
            @click="openDescriptionModal(expense.description)"
        >{{ expense.description.length > 150 ? expense.description.substring(0, 150) + '...' : expense.description }}</pre>
      </div>
    </div>
  </li>

<div v-if="isImageModalOpen"
     class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
     @click.self="closeImageModal">
  <div class="relative max-w-5xl max-h-[90vh] border border-gray-700"> <img :src="currentImageUrl" alt="전체화면 영수증 이미지" class="max-w-full max-h-[90vh] object-contain">
    <button
        @click="closeImageModal"
        class="absolute top-4 right-4 text-white text-4xl bg-gray-800 bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-colors"
        aria-label="모달 닫기"
    ><i class="fa-solid fa-times text-base"></i></button>
  </div>
</div>

<div v-if="isDescriptionModalOpen"
     class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
     @click.self="closeDescriptionModal">
  <div class="relative bg-white rounded-lg p-6 max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200">
    <h3 class="text-xl font-bold mb-4 text-primary-dark">영수증 상세 내용</h3>
    <pre class="whitespace-pre-wrap break-words text-base text-gray-800">{{ currentDescription }}</pre>
    <button
        @click="closeDescriptionModal"
        class="absolute top-4 right-4 text-gray-700 text-3xl bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-200 transition-colors"
        aria-label="모달 닫기"
    ><i class="fa-solid fa-times text-base"></i></button>
  </div>
</div>
</template>

<script setup lang="ts">
import {computed, ref} from "vue";
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
const isUpdating = ref(false);

// const statuses = ['정산신청', '보류', '이체완료', '수령확인'] as const;

const formatDateToYYMMDD = (timestamp: Timestamp | undefined) => {
  if (!timestamp) return '날짜 없음';
  const date = timestamp.toDate();
  return date.toISOString().slice(0, 10);
};

const editAmountField = async (expenseId: string, currentAmount: number) => {
  if (props.expense.userId !== authStore.currentUserUid && !authStore.isAdmin) return;
  const newAmountStr = window.prompt(`금액을 수정하세요: (현재: ${currentAmount.toLocaleString()}원)`, String(currentAmount));
  if (newAmountStr !== null && newAmountStr.trim() !== '') {
    await expenseStore.updateExpenseField(expenseId, 'amount', newAmountStr);
  } else if (newAmountStr === '') {
    alert('금액을 입력하지 않았습니다. 수정이 취소됩니다.');
  }
};

const editDateField = async (expenseId: string, currentDate: string) => {
  if (props.expense.userId !== authStore.currentUserUid && !authStore.isAdmin) return;
  const newDateStr = window.prompt(`날짜를 수정하세요: (현재: ${currentDate})\n형식:YYYY-MM-DD`, currentDate);
  if (newDateStr !== null && newDateStr.trim() !== '') {
    await expenseStore.updateExpenseField(expenseId, 'date', newDateStr);
  } else if (newDateStr === '') {
    alert('날짜를 입력하지 않았습니다. 수정이 취소됩니다.');
  }
};

const updateStatus = async (newStatus: '정산신청' | '보류' | '이체완료' | '수령확인') => {
  if (props.expense.userId !== authStore.currentUserUid && !authStore.isAdmin) return;

  // 이체완료 <-> 수령확인 간의 전환은 본인만 가능
  const isTransferRelated = (props.expense.status === '이체완료' && newStatus === '수령확인') ||
                            (props.expense.status === '수령확인' && newStatus === '이체완료');

  if (isTransferRelated && props.expense.userId !== authStore.currentUserUid) {
    alert('이체완료 및 수령확인 상태 변경은 본인 영수증인 경우에만 가능합니다.');
    return;
  }

  isUpdating.value = true;
  try {
    // 의도적인 지연을 주어 상태 변경이 순식간에 일어나는 것을 방지
    await new Promise(resolve => setTimeout(resolve, 200));
    await expenseStore.updateExpenseStatus(props.expense.id!, newStatus);
  } finally {
    isUpdating.value = false;
  }
};

const canDelete = computed(() => {
  if (authStore.isAdmin) return true;
  return props.expense.userId === authStore.currentUserUid && props.expense.status === '정산신청';
});

const confirmDelete = async () => {
  if (!canDelete.value) {
    alert('정산신청 상태인 영수증만 삭제할 수 있습니다.');
    return;
  }
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
