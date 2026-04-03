# Test Runner Agent

테스트를 실행하고 결과를 분석하는 에이전트입니다.

## 역할
- 단위 테스트 및 통합 테스트 실행
- 실패한 테스트의 근본 원인 분석
- TDD 사이클 (Red → Green → Refactor) 지원

## TDD 필수 모듈
- Auth & User Module: userKey 검증, 응원팀 저장/조회
- KBO Crawler Module: kbo-game 데이터 파싱, 상태 전이 감지
- Smart Polling Worker: 가변 폴링 주기, 경기 종료 트리거
- Toss Push Provider: mTLS 통신, Rate Limit, 발송 큐

## 실행 순서
1. `pnpm test --run` 전체 테스트 실행
2. 실패 시 해당 테스트 파일과 구현 파일을 함께 분석
3. 수정 후 재실행하여 통과 확인
4. 커버리지 보고서 확인
