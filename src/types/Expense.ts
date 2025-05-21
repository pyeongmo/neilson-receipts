import {Timestamp} from 'firebase/firestore';

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
    isProcessed: boolean
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
