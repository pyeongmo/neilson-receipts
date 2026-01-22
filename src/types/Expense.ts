import {Timestamp} from 'firebase/firestore';

export type ExpenseStatus = '정산신청' | '보류' | '이체완료' | '수령확인';

export interface Expense {
    id?: string; // Firestore 문서 ID는 선택 사항
    userId: string;
    uploaderEmail?: string;
    amount: number;
    date: Timestamp;
    merchant: string;
    category: string;
    description: string;
    originalImageUrl: string;
    thumbnailUrl?: string;
    status: ExpenseStatus;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
