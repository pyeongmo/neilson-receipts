<template>
  <div class="expense-list-container">
    <p v-if="authStore.loading || expenseStore.loading">데이터 로드 중...</p>
    <p v-else-if="!authStore.isLoggedIn" style="color: blue;">로그인해야 지출 내역을 볼 수 있습니다.</p>
    <p v-else-if="expenseStore.error" style="color: red;">{{ expenseStore.error }}</p>
    <ul v-else-if="expenseStore.expenses.length > 0">
      <li v-for="expense in expenseStore.expenses" :key="expense.id" :class="{ completed: expense.isProcessed }">
        <div class="header">
          <h3 style="flex-grow: 1">{{ expense.date?.toDate()?.toISOString().slice(0, 10) || '날짜 없음' }} | {{ expense.amount ? expense.amount.toLocaleString() : '0' }}원</h3>
          <div style="display: flex;">
            <small style="margin-right: 10px; color: #777; flex-grow: 1">{{ expense.uploaderEmail || expense.userId }}</small>
            <div v-if="expense.userId === authStore.currentUserUid" class="status-toggle">
              <label :for="'processed-' + expense.id">
                <input
                    type="checkbox"
                    :id="'processed-' + expense.id"
                    :checked="expense.isProcessed"
                    @change="expenseStore.toggleExpenseProcessedStatus(expense.id!, expense.isProcessed)"
                />
                완료
              </label>
            </div>
            <button v-if="expense.userId === authStore.currentUserUid" @click="confirmDelete(expense.id!)" class="delete-button">
              <i class="fas fa-trash"></i> 삭제
            </button>
          </div>
        </div>
        <div style="display: flex; place-content: stretch">
          <img v-if="expense.originalImageUrl" :src="expense.originalImageUrl" alt="영수증 이미지" style="max-width: 150px; height: auto;">
          <pre style="flex-grow: 1">{{ expense.description }}</pre>
        </div>
      </li>
    </ul>
    <p v-else>아직 등록된 지출 내역이 없습니다.</p>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useAuthStore } from '../stores/authStore'; // authStore 임포트
import { useExpenseStore } from '../stores/expenseStore';

const authStore = useAuthStore();
const expenseStore = useExpenseStore();

// 삭제 확인 함수
const confirmDelete = async (expenseId: string) => {
  if (confirm('이 지출 내역과 연결된 이미지를 정말로 삭제하시겠습니까?')) {
    await expenseStore.deleteExpense(expenseId);
  }
};

// authStore의 user 상태 변화를 감지하여 expenseStore의 fetchExpenses를 호출
watch(() => authStore.user, (newUser) => {
  if (newUser) {
    expenseStore.fetchExpenses();
  } else {
    expenseStore.stopFetchingExpenses();
  }
}, { immediate: true }); // 컴포넌트 마운트 시 즉시 실행
</script>

<style scoped>
.expense-list-container {
  max-width: 800px;
  margin: 40px auto;
}

ul {
  padding: 0;
  margin: 0;
}

li {
  list-style: none;
  padding: 20px;
  margin-bottom:  30px;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  max-width: 600px;
}
li.completed {
  background-color: #cec;
}

.header {
  margin-bottom: 16px; display: flex; justify-content: space-between;
}

@media (max-width: 1200px) {
  .header {
    flex-direction: column;
  }
}

.status-toggle {
  display: flex;
  align-items: center;
  font-size: 0.9em;
  color: #555;
}

.status-toggle label {
  padding: 8px;
  border-radius: 8px;
  background-color: #eee;
  cursor: pointer;
}
.status-toggle label:hover {
  background-color: #ddd;
}
li.completed .status-toggle label {
  background-color: #ada !important;
}

.status-toggle input[type="checkbox"] {
  margin-right: 4px;
  transform: scale(1.2);
  cursor: pointer;
}

.delete-button {
  background-color: #dc3545; /* Red for delete */
  color: white;
  border: none;
  margin-left: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9em;
  display: flex;
  align-items: center;
}

.delete-button:hover {
  background-color: #a71d2a;
}

pre {
  margin: 0;
  padding: 10px;
  overflow: auto;
  max-height: 300px;
  background-color: #eee;
  max-width: calc(100vw - 250px);
}
</style>
