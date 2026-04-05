import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * PushProvider 단위 테스트
 * Phase 03-01: mTLS 인증서 로딩, API 통신, 에러 핸들링 검증
 *
 * vi.hoisted() 패턴 — Phase 2에서 확립된 vitest 호이스팅 이슈 해결 패턴 적용
 */

// https.Agent를 모킹한다 — mTLS 인증서 전달 검증용
const { MockAgent } = vi.hoisted(() => {
  const MockAgent = vi.fn()
  return { MockAgent }
})

vi.mock('node:https', () => ({
  default: {
    Agent: MockAgent,
  },
  Agent: MockAgent,
}))

// global fetch 모킹
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// logger 모킹 — 테스트 출력 오염 방지
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

// push-provider는 모킹 설정 후 import (호이스팅 적용)
const { createPushProvider } = await import('../push-provider')

describe('createPushProvider', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // Test 1: TOSS_MTLS_CERT, TOSS_MTLS_KEY 모두 없을 때 에러
  it('TOSS_MTLS_CERT와 TOSS_MTLS_KEY 환경변수가 모두 없으면 에러를 throw한다', () => {
    delete process.env.TOSS_MTLS_CERT
    delete process.env.TOSS_MTLS_KEY

    expect(() => createPushProvider()).toThrow('mTLS 인증서 환경변수가 설정되지 않았습니다')
  })

  // Test 2: TOSS_MTLS_CERT만 있고 TOSS_MTLS_KEY 없을 때 에러
  it('TOSS_MTLS_CERT만 있고 TOSS_MTLS_KEY가 없으면 에러를 throw한다', () => {
    process.env.TOSS_MTLS_CERT = Buffer.from('dummy-cert').toString('base64')
    delete process.env.TOSS_MTLS_KEY

    expect(() => createPushProvider()).toThrow('mTLS 인증서 환경변수가 설정되지 않았습니다')
  })

  // Test 3: 유효한 인증서로 send() 호출 시 올바른 인자로 fetch가 호출된다
  it('유효한 인증서로 send() 호출 시 올바른 URL, method, body로 fetch가 호출된다', async () => {
    process.env.TOSS_MTLS_CERT = Buffer.from('dummy-cert').toString('base64')
    process.env.TOSS_MTLS_KEY = Buffer.from('dummy-key').toString('base64')
    process.env.TOSS_PUSH_API_URL = 'https://push-api.toss.im/send'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(''),
    })

    const provider = createPushProvider()
    await provider.send({
      userKey: 'user-key-123',
      templateId: 'tmpl-001',
      templateArgs: { teamName: '한화' },
      deepLink: '/game/game-uuid-001',
    })

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://push-api.toss.im/send')
    expect(options.method).toBe('POST')
    const body = JSON.parse(options.body as string)
    expect(body.userKey).toBe('user-key-123')
    expect(body.templateId).toBe('tmpl-001')
    expect(body.templateArgs).toEqual({ teamName: '한화' })
    expect(body.deepLink).toBe('/game/game-uuid-001')
  })

  // Test 4: 200 응답 시 { success: true } 반환
  it('send() 성공 응답(200) 시 { success: true }를 반환한다', async () => {
    process.env.TOSS_MTLS_CERT = Buffer.from('dummy-cert').toString('base64')
    process.env.TOSS_MTLS_KEY = Buffer.from('dummy-key').toString('base64')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(''),
    })

    const provider = createPushProvider()
    const result = await provider.send({
      userKey: 'user-key-123',
      templateId: 'tmpl-001',
      templateArgs: {},
    })

    expect(result).toEqual({ success: true })
  })

  // Test 5: 401 응답 시 { success: false, errorCode: '401', errorMessage: '...' } 반환
  it('send() 실패 응답(401) 시 { success: false, errorCode: "401" }를 반환한다', async () => {
    process.env.TOSS_MTLS_CERT = Buffer.from('dummy-cert').toString('base64')
    process.env.TOSS_MTLS_KEY = Buffer.from('dummy-key').toString('base64')

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: vi.fn().mockResolvedValue('Unauthorized access'),
    })

    const provider = createPushProvider()
    const result = await provider.send({
      userKey: 'user-key-123',
      templateId: 'tmpl-001',
      templateArgs: {},
    })

    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('401')
    expect(result.errorMessage).toBe('Unauthorized access')
  })

  // Test 6: 429 응답 시 { success: false, errorCode: '429', errorMessage: 'Rate limit exceeded' } 반환
  it('send() 응답 429 시 { success: false, errorCode: "429" }를 반환한다', async () => {
    process.env.TOSS_MTLS_CERT = Buffer.from('dummy-cert').toString('base64')
    process.env.TOSS_MTLS_KEY = Buffer.from('dummy-key').toString('base64')

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: vi.fn().mockResolvedValue('Rate limit exceeded'),
    })

    const provider = createPushProvider()
    const result = await provider.send({
      userKey: 'user-key-123',
      templateId: 'tmpl-001',
      templateArgs: {},
    })

    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('429')
    expect(result.errorMessage).toBeDefined()
  })

  // Test 7: 네트워크 에러 시 { success: false, errorCode: 'NETWORK_ERROR', errorMessage: '...' } 반환
  it('send() 네트워크 에러 시 { success: false, errorCode: "NETWORK_ERROR" }를 반환한다', async () => {
    process.env.TOSS_MTLS_CERT = Buffer.from('dummy-cert').toString('base64')
    process.env.TOSS_MTLS_KEY = Buffer.from('dummy-key').toString('base64')

    mockFetch.mockRejectedValueOnce(new Error('네트워크 연결 실패'))

    const provider = createPushProvider()
    const result = await provider.send({
      userKey: 'user-key-123',
      templateId: 'tmpl-001',
      templateArgs: {},
    })

    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('NETWORK_ERROR')
    expect(result.errorMessage).toBe('네트워크 연결 실패')
  })

  // Test 8: send()가 https.Agent(cert/key 포함)를 fetch의 agent 옵션으로 전달한다 (mTLS 검증)
  it('send()는 fetch에 cert/key가 포함된 Agent 인스턴스를 전달한다', async () => {
    const certBase64 = Buffer.from('dummy-cert-pem').toString('base64')
    const keyBase64 = Buffer.from('dummy-key-pem').toString('base64')
    process.env.TOSS_MTLS_CERT = certBase64
    process.env.TOSS_MTLS_KEY = keyBase64

    // vi.fn()을 new로 호출 가능하게 하려면 function 키워드 사용
    const mockAgentInstance = { _isMockAgent: true }
    MockAgent.mockImplementation(function (this: unknown) {
      Object.assign(this as object, mockAgentInstance)
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(''),
    })

    const provider = createPushProvider()
    await provider.send({
      userKey: 'user-key-123',
      templateId: 'tmpl-001',
      templateArgs: {},
    })

    // https.Agent가 올바른 cert/key로 생성되었는지 확인
    expect(MockAgent).toHaveBeenCalledWith({
      cert: Buffer.from(certBase64, 'base64'),
      key: Buffer.from(keyBase64, 'base64'),
    })

    // fetch에 agent 옵션이 전달되었는지 확인 (agent 속성이 존재함)
    const [, options] = mockFetch.mock.calls[0]
    expect(options.agent).toBeDefined()
    expect(options.agent._isMockAgent).toBe(true)
  })
})
