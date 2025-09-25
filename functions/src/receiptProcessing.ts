import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { genkit } from 'genkit';
import { z } from 'zod';
import { googleAI, gemini25FlashLite } from '@genkit-ai/googleai';
import { ExpenseToSave } from './types';
import * as sharp from 'sharp';

// Genkit 초기화
const ai = genkit({
  plugins: [
    googleAI({
      apiKey: functions.config().googleai?.apikey as string,
    }),
  ],
});

// 구조화 출력 스키마 정의
const ReceiptSchema = z.object({
  fullText: z.string().describe('인식한 전체 텍스트'),
  totalAmount: z.number().nullable().describe('총 결제금액. 없으면 null'),
  dateIso: z.string().nullable().describe('구매일자 ISO8601 (예: 2024-12-31). 없으면 null'),
  merchant: z.string().nullable().describe('가맹점명. 없으면 null'),
  category: z.string().nullable().describe('카테고리. 없으면 null'),
});

export const processReceiptImage = functions
  .runWith({ timeoutSeconds: 120, memory: '1GB' })
  .storage.object()
  .onFinalize(async (object) => {
    const db = admin.firestore();
    const auth = admin.auth();
    const storage = admin.storage();

    if (!object.name || !object.bucket) {
      console.log('No object name or bucket specified.');
      return null;
    }
    if (!object.contentType || !object.contentType.startsWith('image/')) {
      console.log('This is not an image. Skipping.');
      return null;
    }

    const fileBucket = object.bucket; // The Storage bucket that contains the file.
    const filePath = object.name; // File path in the bucket.

    // 썸네일 생성을 피하기 위해 처리 중인 파일 스킵
    if (filePath.includes('thumbnails/')) {
      console.log('Thumbnail already created. Skipping.');
      return null;
    }
    console.log(`Processing image: gs://${fileBucket}/${filePath}`);

    // 사용자 UID 추출 (경로에서 추출)
    const pathSegments = filePath.split('/');
    if (pathSegments.length < 2 || pathSegments[0] !== 'receipts') {
      console.error('File not in expected receipts/userId format.');
      return null;
    }
    const userId = pathSegments[1];

    let uploaderEmail: string | undefined;
    try {
      const userRecord = await auth.getUser(userId);
      uploaderEmail = userRecord.email;
      console.log(`Uploader email fetched: ${uploaderEmail}`);
    } catch (error) {
      console.error(`Error fetching user data for ${userId}:`, error);
      uploaderEmail = undefined; // 이메일을 가져오지 못하면 undefined
    }

    let fullText = '영수증에서 텍스트를 찾을 수 없습니다.';
    let extractedAmount: number | null = null;
    let extractedDate: Timestamp | null = null;
    let extractedMerchant = '알 수 없음';
    let extractedCategory = '미분류';
    let thumbnailUrl: string | null = null;

    try {
      const file = storage.bucket(fileBucket).file(filePath);
      const [fileContents] = await file.download();

      // --- 썸네일 생성 및 업로드 로직 추가 시작 ---
      const thumbnailName = `receipts/${userId}/thumbnails/${pathSegments.slice(2).join('/')}_150x150.webp`;
      const thumbnailFile = storage.bucket(fileBucket).file(thumbnailName);
      const thumbnailStream = thumbnailFile.createWriteStream({
        metadata: { contentType: 'image/webp' },
      });

      // sharp를 사용하여 이미지 크기를 150px로 조절하고 WebP 포맷으로 변환
      const pipeline = sharp(fileContents)
        .resize(150, 150, {
          fit: sharp.fit.inside,
          withoutEnlargement: true,
        })
        .webp({ quality: 80 });

      await pipeline.pipe(thumbnailStream).on('finish', () => console.log('Thumbnail generated and uploaded.'));
      thumbnailUrl = `https://storage.googleapis.com/${fileBucket}/${encodeURIComponent(thumbnailName).replace(/%2F/g, '/')}`;
      // --- 썸네일 생성 및 업로드 로직 추가 종료 ---

      // Gemini(Genkit)로 멀티모달 분석 및 구조화 추출
      console.log('Sending image to Gemini via Genkit');
      const prompt = `
다음 이미지는 영수증입니다. 한국어/영문 혼합일 수 있습니다.
- 총 결제금액(totalAmount)을 숫자로 추출하세요(통화기호, 콤마 제거).
- 구매일자(dateIso)는 가능한 ISO8601(YYYY-MM-DD) 또는 완전한 날짜로 보정하세요.
- 가맹점명(merchant), 카테고리(category)도 가능하면 추출하세요.
- 추가 텍스트는 fullText로 원문을 최대한 포함하세요.
응답은 반드시 JSON 형식만 출력하세요.
      `.trim();

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const result = await ai.generate({
        model: gemini25FlashLite,
        prompt: [
          { text: prompt },
          { text: '이 이미지에서 정보를 추출해 주세요.' },
          { media: { contentType: object.contentType, url: file.publicUrl() } },
        ],
        output: { format: 'json', schema: ReceiptSchema },
      });

      const parsed = result.output;
      if (parsed) {
        fullText = parsed.fullText || fullText;
        extractedAmount = typeof parsed.totalAmount === 'number' ? parsed.totalAmount : null;

        if (parsed.dateIso) {
          try {
            const d = new Date(parsed.dateIso);
            if (!isNaN(d.getTime())) {
              extractedDate = Timestamp.fromDate(d);
            }
          } catch (e) {
            console.warn('Failed to parse dateIso from Gemini:', parsed.dateIso, e);
          }
        }
        if (parsed.merchant) extractedMerchant = parsed.merchant;
        if (parsed.category) extractedCategory = parsed.category;
      } else {
        console.log('No structured output returned by Gemini.');
      }
    } catch (error) {
      console.error('Error during Gemini or thumbnail processing:', error);
      fullText = '영수증 처리 중 오류가 발생했습니다.';
    }

    const originalImageUrl = `https://storage.googleapis.com/${fileBucket}/${encodeURIComponent(filePath).replace(/%2F/g, '/')}`;

    const expenseData: ExpenseToSave = {
      userId: userId,
      uploaderEmail: uploaderEmail,
      amount: extractedAmount !== null ? extractedAmount : 0,
      date: extractedDate || admin.firestore.FieldValue.serverTimestamp(),
      merchant: extractedMerchant,
      category: extractedCategory,
      description: fullText.substring(0, Math.min(fullText.length, 500)),
      originalImageUrl: originalImageUrl,
      thumbnailUrl: thumbnailUrl || '',
      isProcessed: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    try {
      await db.collection('expenses').add(expenseData);
      console.log('Expense data saved to Firestore successfully.');
    } catch (error) {
      console.error('Error saving expense data to Firestore:', error);
    }

    return null;
  });
