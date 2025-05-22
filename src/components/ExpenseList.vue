<template>
  <div class="expense-list-container">
    <p v-if="authStore.loading || expenseStore.loading">데이터 로드 중...</p>
    <p v-else-if="!authStore.isLoggedIn" class="info-message">로그인해야 지출 내역을 볼 수 있습니다.</p>
    <p v-else-if="expenseStore.error" class="error-message">{{ expenseStore.error }}</p>

    <div v-else-if="expenseStore.expenses.length > 0">
      <ul>
        <li v-for="expense in expenseStore.expenses" :key="expense.id" :class="{ completed: expense.isProcessed }">
          <div class="expense-item-header">
            <h3 class="expense-item-header__title">
              <span
                  @click="editDateField(expense.id!, formatDateToYYMMDD(expense.date))"
                  class="editable-field"
                  v-if="expense.userId === authStore.currentUserUid"
              >
                {{ formatDateToYYMMDD(expense.date) }}
              </span>
              <span v-else>
                {{ formatDateToYYMMDD(expense.date) }}
              </span>
              |
              <span
                  @click="editAmountField(expense.id!, expense.amount)"
                  class="editable-field"
                  v-if="expense.userId === authStore.currentUserUid"
              >
                {{ expense.amount ? expense.amount.toLocaleString() : '0' }}원
              </span>
              <span v-else>
                {{ expense.amount ? expense.amount.toLocaleString() : '0' }}원
              </span>
            </h3>
            <div class="expense-item-header__actions">
              <small class="expense-item-header__uploader-info">{{ expense.uploaderEmail?.split('@')[0] || expense.userId }}</small>
              <div v-if="expense.userId === authStore.currentUserUid" class="status-toggle">
                <label :for="'processed-' + expense.id">
                  <input
                      type="checkbox"
                      :id="'processed-' + expense.id"
                      :checked="expense.isProcessed"
                      @change="expenseStore.toggleExpenseProcessedStatus(expense.id!, expense.isProcessed);"
                  />
                  완료
                </label>
              </div>
              <button v-if="expense.userId === authStore.currentUserUid" @click="confirmDelete(expense.id!)" class="delete-button">
                <i class="fas fa-trash"></i> 삭제
              </button>
            </div>
          </div>
          <div class="expense-item-body">
            <img v-if="expense.originalImageUrl" :src="expense.originalImageUrl" alt="영수증 이미지" class="expense-item-body__image">
            <pre class="expense-item-body__description">{{ expense.description }}</pre>
          </div>
        </li>
      </ul>
    </div>
    <p v-else>아직 등록된 지출 내역이 없습니다.</p>
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

<style scoped>
.expense-list-container {
  max-width: 800px; /* 데스크톱 기본 최대 너비 */
  margin: 40px auto; /* 상하 마진은 App.vue의 main-content-wrapper와 조율 */
  padding: 0;
  box-sizing: border-box;
}

/* 메시지 스타일 */
.info-message {
  color: blue;
  text-align: center;
  padding: 20px;
  background-color: #e0f2f7; /* 연한 파란색 배경 */
  border-radius: 8px;
  margin-bottom: 20px;
}

.error-message {
  color: red;
  text-align: center;
  padding: 20px;
  background-color: #ffe6e6; /* 연한 빨간색 배경 */
  border-radius: 8px;
  margin-bottom: 20px;
}

ul {
  padding: 0;
  margin: 0;
}

li {
  list-style: none;
  padding: 20px;
  margin-bottom: 30px;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  max-width: 600px; /* 각 항목의 최대 너비 */
  margin-left: auto; /* 우측 정렬 효과 */
  margin-right: auto; /* 중앙 정렬 효과 */
  text-align: left; /* 내부 텍스트 왼쪽 정렬 */
}
li.completed {
  background-color: #e6ffe6;
}

/* 영수증 항목 헤더 */
.expense-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}

.expense-item-header__title {
  flex-grow: 1;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 10px;
}

.expense-item-header__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.expense-item-header__uploader-info {
  margin-right: 10px;
  color: #777;
  white-space: nowrap;
  font-size: 0.9em;
}

.editable-field {
  cursor: pointer;
  text-decoration: underline dotted;
  color: #007bff;
}

.editable-field:hover {
  color: #0056b3;
}

.status-toggle {
  display: flex;
  align-items: center;
  font-size: 0.9em;
  color: #555;
  white-space: nowrap;
}

.status-toggle label {
  padding: 8px;
  border-radius: 8px;
  background-color: #eee;
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.status-toggle label:hover {
  background-color: #ddd;
}
li.completed .status-toggle label {
  background-color: #bada55 !important;
}

.status-toggle input[type="checkbox"] {
  margin-right: 4px;
  transform: scale(1.2);
  cursor: pointer;
}

.delete-button {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9em;
  display: flex;
  align-items: center;
  white-space: nowrap;
  transition: background-color 0.2s ease;
}

.delete-button:hover {
  background-color: #a71d2a;
}

/* 영수증 항목 본문 (이미지, 설명) */
.expense-item-body {
  display: flex;
  align-items: flex-start;
  gap: 15px;
}

.expense-item-body__image {
  max-width: 150px;
  height: auto;
  border: 1px solid #ddd;
  border-radius: 5px;
  flex-shrink: 0;
}

.expense-item-body__description {
  margin: 0;
  padding: 10px;
  overflow: auto; /* 필요 시에만 스크롤이 생기도록 */
  max-height: 300px; /* 너무 길어지지 않도록 최대 높이 제한 */
  background-color: #f5f5f5;
  border-radius: 5px;
  flex-grow: 1;
  max-width: calc(100% - 150px - 15px);
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.9em; /* 텍스트 크기 약간 줄임 */
}

/* Media Queries for responsiveness */
@media (max-width: 1000px) {
  .expense-list-container {
    max-width: 95%;
    margin: 20px auto;
  }
  li {
    max-width: 100%;
    padding: 15px;
    margin-bottom: 20px;
  }
  .expense-item-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .expense-item-header__title {
    padding-right: 0;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
    width: 100%;
  }
  .expense-item-header__actions {
    width: 100%;
    justify-content: flex-end;
    gap: 8px;
  }
  .expense-item-header__uploader-info {
    margin-right: 0;
    width: 100%;
    text-align: right;
  }
}
@media (max-width: 600px) {
  li {
    padding: 12px;
    margin-bottom: 15px;
  }
  .expense-item-header__uploader-info,
  .status-toggle,
  .delete-button {
    font-size: 0.85em;
  }
  .status-toggle label,
  .delete-button {
    padding: 6px 10px;
  }
}
</style>
