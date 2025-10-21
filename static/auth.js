// /static/auth.js

import { state } from "./state.js";

/**
 * 로그인 폼 제출을 처리합니다.
 * @param {Event} e - 폼 제출 이벤트
 * @returns {Promise<boolean>} 로그인 성공 여부를 반환합니다.
 */
export async function handleLoginSubmit(e) {
  e.preventDefault();
  const authMessage = document.getElementById("auth-message");
  const data = Object.fromEntries(new FormData(e.target));

  if (!data.email || !data.password || !authMessage) return false;

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (res.ok) {
      state.currentUser = result.user;
      state.currentUser.password = data.password;
      sessionStorage.setItem("currentUser", JSON.stringify(state.currentUser));
      return true; // 성공 시 true 반환
    } else {
      authMessage.textContent = result.message;
      authMessage.className = "mt-4 text-center text-sm text-red-400";
      return false; // 실패 시 false 반환
    }
  } catch (error) {
    authMessage.textContent = "서버 통신 오류.";
    return false;
  }
}

/**
 * 회원가입 폼 제출을 처리합니다.
 * @param {Event} e - 폼 제출 이벤트
 */
export async function handleSignupSubmit(e) {
  e.preventDefault();
  const authMessage = document.getElementById("auth-message");
  const data = Object.fromEntries(new FormData(e.target));

  if (!data.name || !data.email || !data.password || !authMessage) return;

  try {
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      authMessage.textContent = "회원가입 성공! 로그인해주세요.";
      authMessage.className = "mt-4 text-center text-sm text-green-400";
      document.getElementById("show-login")?.click();
    } else {
      const result = await res.json();
      authMessage.textContent = result.message;
      authMessage.className = "mt-4 text-center text-sm text-red-400";
    }
  } catch (error) {
    authMessage.textContent = "서버 통신 오류.";
  }
}

/**
 * 로그아웃을 처리하고 페이지를 새로고침합니다.
 */
export function logout() {
  document.getElementById("page-body")?.classList.remove("planner-background");
  sessionStorage.removeItem("currentUser");
  state.currentUser = null;

  if (state.monacoEditor) {
    state.monacoEditor.dispose();
    state.monacoEditor = null;
  }
  if (state.monacoEditorMobile) {
    state.monacoEditorMobile.dispose();
    state.monacoEditorMobile = null;
  }
  location.reload();
}
