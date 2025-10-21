// /static/state.js

/**
 * 애플리케이션 전체에서 공유되는 상태 객체입니다.
 * 모든 모듈은 이 파일을 import하여 동일한 상태를 참조하고 수정합니다.
 */
export let state = {
  currentUser: null,
  currentWeek: 1,
  currentCycleIndex: 0,
  currentModalType: null,
  previousModalType: null,
  weekData: null,
  syntaxDb: null,
  classes: [],
  monacoEditor: null,
  monacoEditorMobile: null,
};
