/**
 * 애플리케이션 상수 정의
 */

// 이미지 URL
export const IMAGE_URLS = {
  officeBg: '/images/office-bg.jpg',
  lectureBg: '/images/lecture-bg.jpg',
  alex: '/images/alex.png',
  sena: '/images/sena.png',
  profKim: '/images/prof-kim.png',
  userAvatar: '/images/user-avatar.png',
  plannerBg: '/images/planner_bg.jpg',
} as const

// 커리큘럼 매핑
export const CURRICULUM: Record<number, string> = {
  1: '신입사원 온보딩 및 개발 환경 구축',
  2: '데이터 기본기: 변수, 자료형, 연산자',
  3: '흐름 제어: 조건과 반복',
  4: '코드 재사용의 시작: 함수',
  5: '자료구조 (1): 리스트와 튜플',
  6: '자료구조 (2): 딕셔너리와 집합',
  7: '모듈화 및 중간 프로젝트',
  8: '객체 지향 (1): 클래스와 객체',
  9: '객체 지향 (2): 상속',
  10: '파일 처리와 예외 관리',
  11: '파이썬 생태계 첫걸음',
  12: '최종 프로젝트: 주소록 제작',
}

// 문법 키 매핑
export const SYNTAX_MAP: Record<string, string[]> = {
  installation: ['variables', 'data_types'],
  ide_setup: [],
  print_statement: ['print_function'],
  variables_datatypes: ['variables', 'data_types'],
  operators: ['operators'],
  string_formatting: ['f_string', 'variables'],
  if_statement: ['if_statement', 'operators'],
  while_loop: ['while_loop'],
  for_loop: ['for_in_loop', 'range_function', 'list_data_structure'],
  function_def: ['function_def'],
  function_params_return: ['function_def', 'function_return'],
  variable_scope: ['function_scope', 'variables'],
  list_basic: ['list_data_structure', 'list_methods'],
  list_advanced: ['indexing_slicing', 'list_methods'],
  tuple_data: ['tuple_data_structure'],
  dict_basic: ['dict_data_structure'],
  dict_methods: ['dict_methods', 'for_in_loop'],
  set_data: ['set_data_structure'],
  modules: ['module_import', 'name_main_block'],
  os_time_modules: ['module_import'],
  project_integration: ['for_in_loop', 'if_statement', 'list_data_structure', 'variables', 'module_import'],
  oop_concept: ['class_def'],
  class_init: ['class_init_self', 'class_def'],
  class_methods: ['class_method', 'class_init_self'],
  oop_inheritance: ['class_inheritance', 'class_init_self'],
  oop_poly: ['class_inheritance', 'class_method'],
  file_io: ['file_io_with'],
  exceptions: ['exception_handling', 'file_io_with'],
  std_lib: ['module_import'],
  pip_requests: ['pip_install', 'requests_lib', 'module_import'],
  final_project_design: ['class_def', 'dict_data_structure', 'pickle_module'],
  final_project_core: ['class_init_self', 'dict_methods', 'if_statement', 'while_loop'],
  final_project_complete: ['pickle_module', 'file_io_with', 'exception_handling'],
}

// API 엔드포인트
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/login',
    SIGNUP: '/api/signup',
  },
  SCENARIO: {
    GET_WEEK: (week: number) => `/api/scenario/week/${week}`,
  },
  PROGRESS: {
    UPDATE: '/api/progress/update',
    UPDATE_LIVE_CODE: '/api/livecode/update',
    SET_PAUSE: '/api/pause/set',
    CLEAR_PAUSE: '/api/pause/clear',
  },
  CLASS: {
    LIST: '/api/classes',
    CREATE: '/api/classes/create',
    DELETE: '/api/classes/delete',
    JOIN: '/api/classes/join',
    GET: (classId: string) => `/api/class/${classId}`,
  },
  QUESTION: {
    ASK: '/api/question/ask',
    ANSWER: '/api/question/answer',
    MY_QUESTIONS: '/api/questions/my',
  },
  LOG: {
    SUBMISSION: '/api/log/submission',
    REFLECTION: '/api/log/reflection',
  },
  ANALYTICS: {
    CLASS: (classId: string) => `/api/analytics/class/${classId}`,
    MY_GROWTH: '/api/analytics/my-growth',
  },
  CODING_INTRO: {
    SEEN: '/api/coding-intro/seen',
  },
} as const

// 로컬 스토리지 키
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'eduverse_auth_token',
  USER: 'eduverse_user',
} as const
