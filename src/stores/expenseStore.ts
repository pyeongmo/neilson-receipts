import {defineStore} from 'pinia';
import {
    collection, query, orderBy, onSnapshot, type Unsubscribe,
    doc, updateDoc, deleteDoc, Timestamp
} from "firebase/firestore";
import { db, auth, uploadReceiptImage } from '../firebaseConfig';
import {type Expense} from '../types/Expense';

export const useExpenseStore = defineStore('expense', {
    state: () => ({
        expenses: [] as Expense[], // Expense 인터페이스 배열로 타입 지정
        loading: false,
        error: null as string | null, // 에러 메시지 타입
        unsubscribe: null as Unsubscribe | null, // Firestore 구독 해제 함수 타입

        uploading: false, // 업로드 중인지 여부
        uploadError: null as string | null, // 업로드 관련 에러
        uploadSuccessMessage: null as string | null, // 업로드 성공 메시지
        uploadProgress: 0 // 업로드 진행률 (0-100)
    }),
    actions: {
        async fetchExpenses() {
            if (!auth.currentUser) {
                this.error = '로그인이 필요합니다.';
                return;
            }

            this.loading = true;
            this.error = null;

            // 이전 구독 해제 (중복 구독 방지)
            if (this.unsubscribe) {
                this.unsubscribe();
                this.unsubscribe = null;
            }

            try {
                const q = query(
                    collection(db, 'expenses'),
                    orderBy('createdAt', 'desc') // 최신순으로 정렬
                );

                this.unsubscribe = onSnapshot(q, (snapshot) => {
                    const fetchedExpenses: Expense[] = [];
                    snapshot.forEach((doc) => {
                        fetchedExpenses.push({
                            ...doc.data(),
                            id: doc.id,
                        } as Expense);
                    });
                    this.expenses = fetchedExpenses;
                    this.loading = false;
                    console.log('Expenses fetched:', this.expenses.length);
                }, (error) => {
                    console.error('Error fetching expenses:', error);
                    this.error = '지출 내역을 불러오는 데 실패했습니다.';
                    this.loading = false;
                });
            } catch (error: any) {
                console.error('Error setting up expense listener:', error);
                this.error = '지출 내역 리스너 설정 중 오류가 발생했습니다.';
                this.loading = false;
            }
        },
        stopFetchingExpenses() {
            if (this.unsubscribe) {
                this.unsubscribe();
                this.unsubscribe = null;
                console.log('Stopped fetching expenses.');
            }
            this.expenses = []; // 로그아웃 시 목록 비우기
        },
        async uploadReceipt(file: File) {
            if (!auth.currentUser) {
                this.uploadError = '로그인해야 영수증을 업로드할 수 있습니다.';
                return;
            }

            this.uploading = true;
            this.uploadError = null;
            this.uploadSuccessMessage = null;
            this.uploadProgress = 0;

            try {
                await uploadReceiptImage(file, auth.currentUser.uid, (progress) => {
                    this.uploadProgress = progress;
                });
                this.uploadSuccessMessage = '업로드 완료! 처리가 끝나면 아래에 표시됩니다.';
            } catch (error: any) {
                console.error('Error uploading receipt:', error);
                this.uploadError = `영수증 업로드 실패: ${error.message}`;
            } finally {
                this.uploading = false;
                this.uploadProgress = 0; // 완료 후 초기화
            }
        },
        /**
         * 특정 지출 내역의 처리 완료 상태를 토글하고 Firestore에 업데이트합니다.
         * @param expenseId 토글할 지출 내역의 ID
         * @param currentStatus 현재 isProcessed 상태
         */
        async toggleExpenseProcessedStatus(expenseId: string, currentStatus: boolean) {
            if (!auth.currentUser) {
                this.error = '로그인해야 지출 내역을 업데이트할 수 있습니다.';
                return;
            }

            try {
                const expenseRef = doc(db, 'expenses', expenseId);
                await updateDoc(expenseRef, {
                    isProcessed: !currentStatus, // 현재 상태의 반대로 토글
                    updatedAt: Timestamp.now(),
                });
                console.log(`Expense ${expenseId} processed status toggled to ${!currentStatus}`);
            } catch (error: any) {
                console.error('Error toggling expense processed status:', error.message);
                this.error = `지출 내역 업데이트 실패: ${error.message}`;
            }
        },

        /**
         * 특정 지출 내역을 Firestore에서 삭제하도록 요청합니다.
         * 연결된 Storage 이미지는 Cloud Functions가 처리합니다.
         * @param expenseId 삭제할 지출 내역의 ID
         */
        async deleteExpense(expenseId: string) {
            if (!auth.currentUser) {
                this.error = '로그인해야 지출 내역을 삭제할 수 있습니다.';
                return;
            }

            this.loading = true;
            this.error = null;

            try {
                const expenseDocRef = doc(db, 'expenses', expenseId);
                await deleteDoc(expenseDocRef);
                console.log(`Expense ${expenseId} deletion requested to Firestore.`);
            } catch (error: any) {
                console.error('Error deleting expense:', error.message);
                this.error = `지출 내역 삭제 실패: ${error.message}`;
            } finally {
                this.loading = false;
            }
        },
        /**
         * 특정 지출 내역의 필드를 업데이트합니다.
         * @param expenseId 업데이트할 지출 내역의 ID
         * @param field 업데이트할 필드 이름 (예: 'amount', 'date')
         * @param value 새로운 값
         */
        async updateExpenseField(expenseId: string, field: 'amount' | 'date', value: any) {
            if (!auth.currentUser) {
                this.error = '로그인해야 지출 내역을 수정할 수 있습니다.';
                return;
            }

            this.loading = true;
            this.error = null;

            try {
                const expenseRef = doc(db, 'expenses', expenseId);
                let updateData: { [key: string]: any } = {
                    updatedAt: Timestamp.now(), // 업데이트 시간 기록
                };

                if (field === 'amount') {
                    const parsedAmount = parseFloat(value);
                    if (isNaN(parsedAmount) || parsedAmount < 0) {
                        // noinspection ExceptionCaughtLocallyJS
                        throw new Error('유효하지 않은 금액입니다. 숫자를 입력해주세요.');
                    }
                    updateData.amount = parsedAmount;
                } else if (field === 'date') {
                    // 'YYYY-MM-DD' 형식의 문자열을 Date 객체로 변환
                    const parsedDate = new Date(value);
                    if (isNaN(parsedDate.getTime())) {
                        // noinspection ExceptionCaughtLocallyJS
                        throw new Error('유효하지 않은 날짜 형식입니다. YYYY-MM-DD 형식으로 입력해주세요.');
                    }
                    updateData.date = Timestamp.fromDate(parsedDate); // Date 객체를 Firestore Timestamp로 변환
                }

                await updateDoc(expenseRef, updateData);
                console.log(`Expense ${expenseId} field '${field}' updated successfully.`);

            } catch (error: any) {
                console.error(`Error updating expense field ${field}:`, error.message);
                this.error = `지출 내역 수정 실패 (${field}): ${error.message}`;
            } finally {
                this.loading = false;
            }
        },
    },
});
