import {defineStore} from 'pinia';
import {
    collection, query, orderBy, limit, onSnapshot, type Unsubscribe,
    doc, updateDoc, deleteDoc, Timestamp,
    where, getDocs, startAfter, type QueryDocumentSnapshot, type DocumentData,
} from "firebase/firestore";
import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    type StorageReference,
    type UploadTask
} from "firebase/storage";
import {db, auth, storage} from '../firebaseConfig';
import {type Expense, type ExpenseStatus} from '../types/Expense';

export const useExpenseStore = defineStore('expense', {
    state: () => ({
        expenses: [] as Expense[], // Expense 인터페이스 배열로 타입 지정
        loading: false,
        isFetchingMore: false,
        hasMore: true,
        lastVisible: null as QueryDocumentSnapshot<DocumentData> | null,
        error: null as string | null, // 에러 메시지 타입
        unsubscribe: null as Unsubscribe | null, // Firestore 구독 해제 함수 타입

        uploading: false, // 업로드 중인지 여부
        uploadError: null as string | null, // 업로드 관련 에러
        uploadSuccessMessage: null as string | null, // 업로드 성공 메시지
        uploadProgress: 0 // 업로드 진행률 (0-100)
    }),
    actions: {
        // 실시간으로 지출 내역을 불러오는 함수 (초기 로딩)
        async fetchExpenses() {
            if (!auth.currentUser) {
                this.error = '로그인이 필요합니다.';
                return;
            }

            this.loading = true;
            this.error = null;
            this.hasMore = true;
            this.lastVisible = null;

            // 이전 구독 해제 (중복 구독 방지)
            if (this.unsubscribe) {
                this.unsubscribe();
                this.unsubscribe = null;
            }

            try {
                // 초기 10개 가져옴
                const q = query(
                    collection(db, 'expenses'),
                    orderBy('createdAt', 'desc'),
                    limit(10)
                );

                this.unsubscribe = onSnapshot(q, (snapshot) => {
                    const fetchedExpenses: Expense[] = [];
                    snapshot.forEach((doc) => {
                        fetchedExpenses.push({
                            ...doc.data(),
                            id: doc.id,
                        } as Expense);
                    });

                    // Snapshot 업데이트 시 lastVisible 갱신 (추가 로딩 기준점)
                    if (snapshot.docs.length > 0) {
                        this.lastVisible = snapshot.docs[snapshot.docs.length - 1]!;
                    }

                    // 초기 데이터 로드 시 hasMore 체크
                    this.hasMore = snapshot.docs.length >= 10;

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
        // 추가 데이터를 불러오는 함수 (무한 스크롤)
        async fetchMoreExpenses() {
            if (!auth.currentUser || !this.lastVisible || !this.hasMore || this.isFetchingMore) {
                return;
            }

            this.isFetchingMore = true;
            console.log('Fetching more expenses...');

            try {
                const q = query(
                    collection(db, 'expenses'),
                    orderBy('createdAt', 'desc'),
                    startAfter(this.lastVisible),
                    limit(10)
                );

                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    this.hasMore = false;
                } else {
                    const moreExpenses: Expense[] = [];
                    querySnapshot.forEach((doc) => {
                        moreExpenses.push({
                            ...doc.data(),
                            id: doc.id,
                        } as Expense);
                    });

                    this.expenses = [...this.expenses, ...moreExpenses];
                    this.lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1]!;

                    if (querySnapshot.docs.length < 10) {
                        this.hasMore = false;
                    }
                }
            } catch (error: any) {
                console.error('Error fetching more expenses:', error);
                this.error = '추가 지출 내역을 불러오는 데 실패했습니다.';
            } finally {
                this.isFetchingMore = false;
            }
        },
        stopFetchingExpenses() {
            if (this.unsubscribe) {
                this.unsubscribe();
                this.unsubscribe = null;
                console.log('Stopped fetching expenses.');
            }
            this.expenses = []; // 로그아웃 시 목록 비우기
            this.lastVisible = null;
            this.hasMore = true;
        },
        /**
         * 완료되지 않은 영수증을 사용자(이메일)별로 묶어 금액을 요약합니다.
         * @returns {Promise<Record<string, number>>} 사용자 이메일을 키로 하고 총 금액을 값으로 하는 객체.
         */
        async getUnprocessedSummary(): Promise<Record<string, number>> {
            this.loading = true;
            this.error = null;
            const summary: Record<string, number> = {};

            try {
                const q = query(
                    collection(db, 'expenses'),
                    where('status', 'in', ['정산신청', '보류'])
                );
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => {
                    const expense = doc.data() as Expense;
                    const uploaderEmail = expense.uploaderEmail || '알 수 없음';
                    summary[uploaderEmail] = (summary[uploaderEmail] || 0) + (expense.amount || 0);
                });
                return summary;
            } catch (e: any) {
                console.error("Error fetching unprocessed summary: ", e);
                this.error = '미처리 영수증 요약을 불러오는 데 실패했습니다: ' + e.message;
                return {};
            } finally {
                this.loading = false;
            }
        },
        // 새로운 지출 내역 추가
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
         * 특정 지출 내역의 상태를 업데이트하고 Firestore에 반영합니다.
         * @param expenseId 업데이트할 지출 내역의 ID
         * @param newStatus 변경할 새로운 상태
         */
        async updateExpenseStatus(expenseId: string, newStatus: ExpenseStatus) {
            if (!auth.currentUser) {
                this.error = '로그인해야 지출 내역을 업데이트할 수 있습니다.';
                return;
            }

            try {
                const expenseRef = doc(db, 'expenses', expenseId);
                await updateDoc(expenseRef, {
                    status: newStatus,
                    updatedAt: Timestamp.now(),
                });
                console.log(`Expense ${expenseId} status updated to ${newStatus}`);
            } catch (error: any) {
                console.error('Error updating expense status:', error.message);
                this.error = `지출 내역 상태 업데이트 실패: ${error.message}`;
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


/**
 * Firebase Storage에 파일을 업로드하는 함수
 * @param file 업로드할 File 객체
 * @param userId 현재 로그인한 사용자의 UID
 * @param onProgress (선택 사항) 업로드 진행률을 업데이트할 콜백 함수 (0-100)
 * @returns Promise<string> 업로드된 파일의 다운로드 URL
 */
export async function uploadReceiptImage(
    file: File,
    userId: string,
    onProgress?: (progress: number) => void // <-- onProgress 콜백 추가
): Promise<string> {
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef: StorageReference = ref(storage, `receipts/${userId}/${fileName}`);

    const uploadTask: UploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                // console.log(`Upload is ${progress}% done`);
                if (onProgress) { // 콜백 함수가 있다면 호출
                    onProgress(progress);
                }
            },
            (error) => {
                console.error("Image upload failed:", error);
                reject(error);
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    console.log("Image uploaded successfully, URL:", downloadURL);
                    resolve(downloadURL);
                } catch (error) {
                    console.error("Failed to get download URL:", error);
                    reject(error);
                }
            }
        );
    });
}
