# MY ASSETS · 개인 자산관리

휴대폰과 PC에서 순자산, 현금 흐름, 카드 결제일, 투자 수익률을 한눈에 보는 개인용 웹앱입니다.
서버 비용 없이 **GitHub Pages(화면) + Supabase 무료 플랜(데이터)** 으로 운영합니다.

## 기능
- **홈**: 순자산, 지난달 대비 변화, 60일 현금 흐름 예측, 자산 구성, 순자산 추이
- **알림 배너**: 카드 결제 D-7·D-3·당일, 결제 계좌 잔액 부족, 45일 내 현금 부족 예상, 3일 내 고정 출금
- **흐름**: 월별 수입·지출, 6개월 추이, 카테고리 분석, 거래 내역
- **카드**: 카드별 결제 예정액(결제 전 사용 합계)과 결제일, 결제 처리
- **투자**: 종목별 평가금액·손익·수익률, 자산군 비중, 현재가 일괄 수정
- **자산·설정**: 계좌 잔액, 고정 수입·지출, 은행 엑셀 가져오기(하나·제주·KB 형식 확인), JSON 백업

## 처음 설정 (약 10분)
1. **Supabase 프로젝트 만들기** — supabase.com → New project (무료 플랜, 지역 Seoul).
2. **테이블 만들기** — SQL Editor에 `supabase/schema.sql` 전체를 붙여넣고 Run.
3. **연결 정보 입력** — Project Settings → API의 `Project URL`과 `anon public` 키를 `js/config.js`에 넣기.
   - anon 키는 공개되어도 되는 키입니다. 데이터는 로그인 + 행 수준 보안(RLS)으로 본인만 읽습니다.
   - `service_role` 키는 절대 넣지 마세요.
4. **배포** — GitHub 저장소에 올리고 Settings → Pages → Branch `main` / `(root)` 선택.
5. **Supabase 인증 주소 등록** — Authentication → URL Configuration → Site URL에 Pages 주소(예: `https://200gyu.github.io/my-assets/`) 입력.
6. **내 계정 만들기** — 앱 첫 화면에서 "계정 만들기" → 메일 확인 → 로그인.
7. **(중요) 다른 사람 가입 막기** — Authentication → Providers → Email → "Allow new users to sign up" 끄기.

## 휴대폰에 앱처럼 설치
- 아이폰 Safari: 공유 → 홈 화면에 추가
- 안드로이드 Chrome: 메뉴 → 홈 화면에 추가

## 데이터 입력 요령
- 계좌는 현재 잔액으로 시작하고, 이후 기록이 잔액에 자동 반영됩니다(가져오기는 파일의 마지막 잔액으로 맞춤).
- 카드 사용은 결제수단을 카드로 기록 → 카드 화면의 결제 예정액에 쌓이고, 결제일에 "결제 처리".
- 은행 파일 가져오기에서 카드대금 출금은 지출 통계에서 빠집니다(카드 사용분과 이중 집계 방지).
- 투자 현재가는 직접 입력합니다(무료 시세 API는 안정성 문제로 넣지 않음).

## 로컬에서 보기
```
npx http-server . -p 5180 -c-1
```
`js/config.js`가 비어 있으면 샘플 데이터로 실행되는 데모 모드이며, 데이터는 그 브라우저에만 저장됩니다.

## 구조
```
index.html            화면 틀
css/app.css           디자인 (다크 네이비 + 골드)
js/app.js             화면 · 입력 · 가져오기
js/calc.js            순자산 · 카드 결제 · 현금흐름 예측 · 알림 계산
js/store.js           저장소 (Supabase 또는 브라우저)
js/seed.js            데모 샘플 데이터
supabase/schema.sql   테이블 + RLS
```
