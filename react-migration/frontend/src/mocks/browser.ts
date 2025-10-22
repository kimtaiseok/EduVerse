import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// MSW 브라우저 워커 설정
export const worker = setupWorker(...handlers)
