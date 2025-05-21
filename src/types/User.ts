export interface UserProfile {
    userId: string; // Firestore 문서 ID와 동일
    email: string;
    userName?: string;
    corporateCards?: { [key: string]: { cardNumber: string; bankName: string } }; // 임시 법인카드 정보
    bankAccounts?: { [key: string]: { accountNumber: string; bankName: string; accountHolder: string } }; // 정산 계좌 정보
}
