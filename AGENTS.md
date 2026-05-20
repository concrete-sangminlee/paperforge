# AGENTS.md — Trio Workflow

이 프로젝트는 **User + Codex + Claude (Opus 4.7 1M)** 트리오로 협업한다. 이 파일은 Codex 와 Claude 모두 세션 시작 시 자동으로 읽는다 (AGENTS.md 컨벤션).

## 역할

| Agent | Role | Strengths | Weaknesses |
|---|---|---|---|
| **Codex** | doer | broad refactor, 새 기능 구현, 패턴 일괄 적용, 마이그레이션 같은 mechanical 작업 | 디테일 누락 (default 값, fallback chain, brittle test), 검증 얕음 |
| **Claude** | critic + verifier | 회귀 detection, 실제 테스트 실행, edge case, 동작 변경 식별, 프로젝트 메모리 관리 | broad mechanical 작업은 토큰 비쌈, slow |
| **User** | director | 방향성 결정, 두 에이전트 간 트랜스크립트 brokering, 우선순위 판단 | 디테일 직접 처리 비효율 |

## Cycle

1. **User → Codex**: task 던짐 → Codex: 작업 + `tsc --noEmit` + `npm run lint` + commit + push
2. **User → Claude**: Codex 트랜스크립트 통째 복붙
3. **Claude**: `npm test` 까지 실제 실행 → 회귀 발견 시 fix commit + push, 리뷰 보고
4. Claude 리뷰의 **"(선택)" 마크 항목** = Codex 다음 pickup queue
5. **User → Codex**: "남은거 다해" 식으로 던지면 → Codex 가 (선택) 항목 처리
6. **User → Claude**: 코덱스 follow-up 트랜스크립트 → final verification + 메모리 갱신

전달 매체: **git = 코드 동기화**, **트랜스크립트 = 의도·맥락 동기화**. 둘 다 필요.

## 공통 룰 (Codex + Claude 둘 다)

1. **작업트리 항상 clean 으로 마감** — dirty 채 손 떼지 마
2. **검증 보고 정직하게** — "TS/lint 통과 = OK" 아님. Broad refactor 면 실제 `npm test` 안 돌렸으면 "TS/lint 까지만 확인" 으로 표기
3. **Commit 메시지 = 작업 묶음의 의도 한 줄** — `git log` 만 봐도 묶음 단위 파악되게 (`refactor: centralize env access`, `fix: regressions from env centralization` 같은 식)
4. **Working tree 충돌 방지** — 같은 머신·같은 working tree 공유. 동시 작업 절대 금지, 순차만
5. **User 명시 trigger 전까지 새 작업 시작 X** — preamble/AGENTS.md 읽었다고 자동으로 "유용해 보이는 일" 시작하지 마. 인지·acknowledge 만 하고 다음 task 기다려
6. **User 자율 실행 선호** — 추천 방향 정해서 끝까지. 질문은 진짜 critical 한 결정만

## Codex 전용 룰

- Claude 가 `process.env` 직접 접근으로 되돌린 부분 (예: `src/lib/app-url.ts`) 은 **의도된 회귀 수정** — 테스트가 런타임 env mutation 을 요구하기 때문. 다시 env 모듈로 centralize 하지 마
- Client component (`'use client'`) 는 `@/lib/env` 가 아닌 `@/lib/client-env` import. Server env 모듈을 client 에서 import 하면 server-only key 이름이 client bundle 에 박힘
- Worker / WebSocket 패키지 의 `required()` 가 main env 와 달리 throw 하는 건 의도된 차이 (fail-fast)
- broad mechanical 작업 후 자체 검증으로 끝내지 말고 트랜스크립트를 User 에 넘김 — Claude 가 verification cycle 돌릴 것

## Claude 전용 룰

- 메모리: `~/.claude/projects/.../memory/MEMORY.md` 에서 관리. 협업 패턴·사용자 선호·프로젝트 컨텍스트 변경 시 갱신
- Codex 트랜스크립트 받으면 **자동으로 review + verify + fix 모드**. "어떻게 해드릴까요?" 묻지 말고 실행
- 검증 항상 실제 명령으로: `npx tsc --noEmit --pretty false`, `npm run lint`, `npm test` 까지 돌려보고 보고

## 프로젝트 컨텍스트

- **PaperForge**: Next.js 15 + Prisma 7 + BullMQ + MinIO + Redis 의 Overleaf-style LaTeX 웹 에디터, 자체 호스팅 가능
- **Version**: v23.0.0 / `main` branch
- **배포**: Vercel (Redis/MinIO 없으면 fallback 동작 — 로컬 pdflatex, DB 저장)
- **Spec**: `docs/superpowers/specs/2026-03-18-paperforge-design.md`
- **Plan**: `docs/superpowers/plans/2026-03-18-paperforge-implementation.md`
- **최근 작업 라운드**: 환경변수 centralization (3715317 → ce1b058) + CI 확장 (8c5f425)
