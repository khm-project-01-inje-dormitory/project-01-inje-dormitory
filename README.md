# 🏡 펜션 통임대 예약 앱 (Pension Reserve)

방을 고르지 않아도 되는 숙소 예약 서비스 — **집 전체를 하나의 숙소**로 보고, 1인당 요금(10,000~50,000원)만 내면 집 안 어느 방에서든 투숙할 수 있습니다.

관리자 대시보드(예약관리 · 입금확인 · 투숙인원 관리 · 통계 · 갤러리 · 후기 · 설정)를 최우선으로 설계했고, **카드 결제 없이 카카오페이/토스 계좌 송금**으로 운영합니다.

---

## 🏗 아키텍처 — Vercel 단일 호스팅 + Supabase

```
┌────────────────────────────── Vercel ──────────────────────────────┐
│  프론트엔드 (Next.js 페이지)      +  백엔드 (app/api/* = Serverless)  │
│  랜딩 · 예약 · 조회 · 관리자 PWA      예약/입금확정/CSV/푸시/크론 API   │
└───────────────┬───────────────────────────────┬────────────────────┘
                │  환경변수로만 연결               │
        ┌───────▼───────┐               ┌───────▼────────┐
        │  Supabase      │               │  Supabase      │
        │  Postgres (DB) │               │  Storage (사진) │
        └────────────────┘               └────────────────┘
```

| 계층 | 스택 | 무료 운영 |
|---|---|---|
| 프론트엔드 | Next.js 14 (App Router) + TypeScript + Tailwind(디자인 토큰) | **Vercel** Hobby |
| 백엔드 | Next.js API Routes = **Vercel Serverless Functions** (별도 서버 없음) | **Vercel** Hobby |
| 운영 DB | Supabase Postgres | **Supabase** Free |
| 사진 저장 | Supabase Storage (S3 방식) | **Supabase** Free |
| 푸시 | Web Push (VAPID) — Serverless Function에서 발송 | 추가 비용 없음 |
| 아침 브리핑 | Vercel Cron (`vercel.json` 포함) | 무료 티어 지원 |

> ⚠️ 과거 검토된 Railway(상시 백엔드) 구성은 **불필요합니다.** 이 앱의 백엔드는 Next.js API Routes로 작성되어 있어, Vercel에 배포하면 각 API가 자동으로 Serverless Function이 됩니다. 별도 백엔드 서버·접속설정 파일 수정 없이 프런트/백엔드가 한 번의 배포로 함께 올라갑니다.
>
> **환경설정만으로 모드 전환**: Supabase 환경변수 3개를 채우면 운영 모드, 비우면 데모(로컬 파일) 모드 — 코드 수정은 없습니다.
> 단, 데모 모드의 로컬 파일 저장은 서버리스 특성상 **Vercel에서는 유지되지 않습니다**(배포 시마다 초기화). Vercel 배포에서는 반드시 Supabase를 연결하세요. 관리자 대시보드 헤더의 모드 표시로 상태를 항상 확인할 수 있습니다.

---

## ✨ 기능

### 손님용 (웹 · 모바일 반응형)
- 펜션 소개 랜딩: 사진 갤러리, 2주 잔여 현황 캘린더(휴무일 표시), 요금 안내, 손님 후기, 오시는 길
- 예약 신청: 날짜·인원 선택 → 실시간 총액 계산 (1인당 가격 × 인원 × 박수) · 휴무일/인원초과 사전 경고
- 예약 완료: **계좌 복사 / 카카오페이 앱 연동 / 토스 송금 딥링크**(`supertoss://send?bank=…&accountNo=…&amount=…`)로 입금 유도
- 예약 조회·취소: **이름 + 연락처**로 본인 예약 전체 조회(예약코드 불필요) · 투숙완료 후 별점·한줄평 후기 작성

### 관리자용 (대시보드 + 안드로이드 PWA)
- **통계**: 월별 매출 추이, 8주 예약, 요일별 분포, 상태 도넛 + **운영 인사이트**(평균 예약 리드타임·평균 숙박일·재방문 손님·환불 대기)
- **예약관리**: 검색 · 상태 변경 · **카톡 안내문 원클릭 복사** · **기간별 CSV 내보내기(엑셀 한글 호환)** · 환불대기/환불완료 처리
- **입금확인**: 입금대기 배지, 원클릭 입금확정
- **갤러리**: 다중 업로드(브라우저에서 **WebP 자동 축소**) · 삭제
- **후기**: 노출/숨김/삭제 관리
- **설정**: 1인당 요금(10,000~50,000원), 수용 인원, **휴무일 차단**, **예약 자동 마감 토글**, 위치·주차 안내, 계좌, 소개 문구
- **푸시 알림(PWA)**: 새 예약/취소 실시간 알림 + **매일 아침 브리핑**(오늘 체크인/체크아웃/입금대기 요약)

---

## 🚀 로컬/데모 실행

```bash
npm install
npm run dev        # http://localhost:3000
```
- 데모 모드: `data/db.json`에 저장됩니다 (샘플 예약 + 시드 사진 자동 생성)
- 관리자: `/admin` → 기본 비밀번호 `admin1234` (`.env.local`의 `ADMIN_PASSWORD`)

## ☁️ 운영 배포 (Vercel + Supabase — 전부 무료 티어)

1. **Supabase 프로젝트 생성** → SQL Editor에서 `supabase/schema.sql` 전체 실행 (멱등성 보장 — 재실행 안전)
2. **GitHub에 push → Vercel Import** → 환경변수 설정:

   | 변수 | 값 | 비고 |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key | |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key | 서버 전용 — 절대 공개 금지 |
   | `ADMIN_PASSWORD` | 강한 비밀번호 | |
   | `SESSION_SECRET` | 랜덤 문자열 | `openssl rand -hex 32` |
   | `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` | |
   | `VAPID_SUBJECT` | `mailto:이메일` | |
   | `CRON_SECRET` | 랜덤 문자열 | 아침 브리핑 외부 호출 차단용 |

   → 이 환경설정이 **접속환경설정 파일 그 자체**입니다. 코드 수정 없이 배포 즉시 운영 모드로 동작합니다.
3. 배포 완료 → 관리자 PWA 설치: **안드로이드 크롬에서 `/admin` 접속 → 메뉴 → 환 유 화면에 추가** → 대시보드에서 **알림 켜기**
4. 아침 브리핑은 `vercel.json`의 크론 설정으로 자동 등록됩니다 (별도 설정 불필요)

---

## 📁 프로젝트 구조

```
app/
  page.tsx                  # 랜딩 (갤러리/현황/후기/오시는 길/요금)
  reserve/                  # 예약 폼 + 완료(입금안내) 페이지
  lookup/page.tsx           # 예약 조회·취소·후기 작성
  admin/                    # 로그인 + 대시보드
  api/                      # = Vercel Serverless Functions
    reservations/           #   예약 CRUD · 조회 · 취소 · CSV 내보내기
    settings/ availability/ blocked-dates/ reviews/
    admin/login/            #   관리자 인증
    push/                   #   웹푸시 구독/테스트
    cron/briefing/          #   아침 브리핑 (Vercel Cron)
components/
  admin/                    # StatsTab · ReservationTable · GalleryTab · ReviewsTab · SettingsTab
lib/
  store.ts                  # 통합 데이터 계층 (데모↔Supabase 환경변수 전환)
  demo-store.ts             # 데모(로컬 JSON) 구현 — 로컬 검증 전용
  supabase-store.ts         # 운영(Supabase) 구현
  push.ts auth.ts format.ts mode.ts
public/                     # manifest.json · sw.js · icons · uploads(데모 시드)
supabase/schema.sql         # 테이블 + Storage 버킷 + RLS (멱등성)
vercel.json                 # 아침 브리핑 크론
```

## ✅ 운영 전 체크리스트
- [ ] Supabase에서 `schema.sql` 실행 확인 (테이블 6개 + photos 버킷)
- [ ] Vercel 환경변수 10개 입력 → 관리자 대시보드 헤더가 **"Supabase 운영 모드"**로 바뀌는지 확인
- [ ] 관리자 설정 탭: 펜션 이름/소개/계좌/예금주/요금/수용 인원/주소 입력 (샘플 값 교체)
- [ ] 사진 갤러리에 실제 펜션 사진 업로드 (자동 WebP 축소)
- [ ] 관리자 스마트폰 PWA 설치 + 알림 켜기 + 테스트 알림·브리핑 수신 확인
