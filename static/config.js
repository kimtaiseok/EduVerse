/**
 * 애플리케이션 전체에서 사용되는 상수와 설정값들을 관리합니다.
 */

export const IMAGE_URLS = {
  // --- Existing Images ---
  officeBg: "/static/images/office-bg.jpg", // Default office bg (used for task, briefing, etc.)
  lectureBg: "/static/images/lecture-bg.jpg",
  alex: "/static/images/alex.png", // Default Alex (might be replaced or kept as fallback)
  sena: "/static/images/sena.png",
  profKim: "/static/images/prof-kim.png",
  userAvatar: "/static/images/user-avatar.png",

  // --- 👇 New Images Added ---
  introBg: "/static/images/introBG.png", // First login background
  introAlex: "/static/images/introalex.png", // First login Alex character
  morningBg: "/static/images/moning.png", // Weekly briefing background (Morning concept)
  alexMorning: "/static/images/alexMorning.png", // Weekly briefing Alex character (Morning concept)
  selfTalkBg: "/static/images/selftalkBG.jpg", // Student monologue background (with silhouette)
  // --- 👆 New Images Added ---
};

export const CURRICULUM = {
  1: "첫 코드 작성과 데이터 저장",
  2: "데이터 가공하기: 연산자와 문자열",
  3: "흐름 제어: 조건과 반복",
  4: "코드 재사용의 시작: 함수",
  5: "자료구조 (1): 리스트와 튜플",
  6: "자료구조 (2): 딕셔너리와 집합",
  7: "모듈화 및 중간 프로젝트",
  8: "객체 지향 (1): 클래스와 객체",
  9: "객체 지향 (2): 상속",
  10: "파일 처리와 예외 관리",
  11: "파이썬 생태계 첫걸음",
  12: "최종 프로젝트: 주소록 제작",
};

// syntaxMap remains unchanged
export const syntaxMap = {
  installation: ["variables", "data_types"],
  ide_setup: [],
  print_statement: ["print_function"],
  variables_datatypes: ["variables", "data_types"],
  operators: ["operators"],
  string_formatting: ["f_string", "variables"],
  if_statement: ["if_statement", "operators"],
  while_loop: ["while_loop"],
  for_loop: ["for_in_loop", "range_function", "list_data_structure"],
  function_def: ["function_def"],
  function_params_return: ["function_def", "function_return"],
  variable_scope: ["function_scope", "variables"],
  list_basic: ["list_data_structure", "list_methods"],
  list_advanced: ["indexing_slicing", "list_methods"],
  tuple_data: ["tuple_data_structure"],
  dict_basic: ["dict_data_structure"],
  dict_methods: ["dict_methods", "for_in_loop"],
  set_data: ["set_data_structure"],
  modules: ["module_import", "name_main_block"],
  os_time_modules: ["module_import"],
  project_integration: [
    "for_in_loop",
    "if_statement",
    "list_data_structure",
    "variables",
    "module_import",
  ],
  oop_concept: ["class_def"],
  class_init: ["class_init_self", "class_def"],
  class_methods: ["class_method", "class_init_self"],
  oop_inheritance: ["class_inheritance", "class_init_self"],
  oop_poly: ["class_inheritance", "class_method"],
  file_io: ["file_io_with"],
  exceptions: ["exception_handling", "file_io_with"],
  std_lib: ["module_import"],
  pip_requests: ["pip_install", "requests_lib", "module_import"],
  final_project_design: ["class_def", "dict_data_structure", "pickle_module"],
  final_project_core: [
    "class_init_self",
    "dict_methods",
    "if_statement",
    "while_loop",
  ],
  final_project_complete: [
    "pickle_module",
    "file_io_with",
    "exception_handling",
  ],
};
