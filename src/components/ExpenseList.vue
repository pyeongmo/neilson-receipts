<template>
  <div class="max-w-3xl mx-auto my-10 p-0 box-border">
    <p v-if="authStore.loading || expenseStore.loading" class="text-center text-gray-600">데이터 로드 중...</p>
    <p v-else-if="!authStore.isLoggedIn" class="text-center text-blue-600 p-5 bg-blue-50 rounded-lg mb-5">로그인해야 지출 내역을 볼 수 있습니다.</p>
    <p v-else-if="expenseStore.error" class="text-center text-red-600 p-5 bg-red-50 rounded-lg mb-5">{{ expenseStore.error }}</p>

    <div v-else-if="expenseStore.expenses.length > 0">
      <ul class="p-0 m-0">
        <li v-for="expense in expenseStore.expenses" :key="expense.id" :class="['list-none p-5 md:p-6 mb-8 rounded-xl shadow-lg bg-white text-left max-w-xl mx-auto', { 'bg-green-50': expense.isProcessed }]">
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
                       :class="{'!bg-lime-500 !text-white hover:!bg-lime-600': expense.isProcessed}"> <input
                    type="checkbox"
                    :id="'processed-' + expense.id"
                    :checked="expense.isProcessed"
                    @change="expenseStore.toggleExpenseProcessedStatus(expense.id!, expense.isProcessed);"
                    class="mr-1 transform scale-110 cursor-pointer"
                />
                  완료
                </label>
              </div>
              <button v-if="expense.userId === authStore.currentUserUid" @click="confirmDelete(expense.id!)" class="bg-red-500 text-white border-none px-3 py-2 rounded-lg cursor-pointer text-sm flex items-center whitespace-nowrap transition duration-200 ease-in-out hover:bg-red-600">
                <i class="fas fa-trash mr-1"></i> 삭제
              </button>
            </div>
          </div>
          <div class="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <img v-if="expense.originalImageUrl" :src="expense.originalImageUrl" alt="영수증 이미지" class="max-w-[150px] h-auto border border-gray-300 rounded-md flex-shrink-0">
            <pre class="m-0 p-3 overflow-auto max-h-[300px] bg-gray-100 rounded-md flex-grow max-w-full sm:max-w-[calc(100%-150px-1rem)] whitespace-pre-wrap break-words text-sm text-gray-700">
              {{ expense.description }}
            </pre>
          </div>
        </li>
      </ul>
    </div>
    <p v-else class="text-center text-gray-600 mt-10">아직 등록된 지출 내역이 없습니다.</p>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { useExpenseStore } from '../stores/expenseStore';
import { Timestamp } from 'firebase/firestore';

const authStore = useAuthStore();
const expenseStore = useExpenseStore();

const formatDateToYYMMDD = (timestamp: Timestamp | undefined) => {
  if (!timestamp) return '날짜 없음';
  const date = timestamp.toDate();
  return date.toISOString().slice(0, 10);
};

const editAmountField = async (expenseId: string, currentAmount: number) => {
  const newAmountStr = window.prompt(`금액을 수정하세요: (현재: ${currentAmount.toLocaleString()}원)`, String(currentAmount));
  if (newAmountStr !== null && newAmountStr.trim() !== '') {
    await expenseStore.updateExpenseField(expenseId, 'amount', newAmountStr);
  } else if (newAmountStr === '') {
    alert('금액을 입력하지 않았습니다. 수정이 취소됩니다.');
  }
};

const editDateField = async (expenseId: string, currentDate: string) => {
  const newDateStr = window.prompt(`날짜를 수정하세요: (현재: ${currentDate})\n형식:YYYY-MM-DD`, currentDate);
  if (newDateStr !== null && newDateStr.trim() !== '') {
    await expenseStore.updateExpenseField(expenseId, 'date', newDateStr);
  } else if (newDateStr === '') {
    alert('날짜를 입력하지 않았습니다. 수정이 취소됩니다.');
  }
};

const confirmDelete = async (expenseId: string) => {
  if (confirm('이 지출 내역과 연결된 이미지를 정말로 삭제하시겠습니까?')) {
    await expenseStore.deleteExpense(expenseId);
  }
};

watch(() => authStore.user, (newUser) => {
  if (newUser) {
    expenseStore.fetchExpenses();
  } else {
    expenseStore.stopFetchingExpenses();
  }
}, { immediate: true });
</script>
