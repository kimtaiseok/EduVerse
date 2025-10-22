# EduVerse 마이그레이션 프로젝트 시작 가이드

## 🎯 프로젝트 개요

Flask + Vanilla JS로 구현된 EduVerse를 **Spring Boot + React**로 마이그레이션하는 프로젝트입니다.

---

## 📁 프로젝트 구조

```
react-migration/
├── backend/                    # Spring Boot 백엔드
│   ├── src/main/java/com/logicore/eduverse/
│   │   ├── EduverseApplication.java
│   │   ├── config/
│   │   │   └── FirebaseConfig.java
│   │   └── dto/
│   │       └── ApiResponse.java
│   ├── src/main/resources/
│   │   └── application.yml
│   ├── pom.xml
│   └── README.md
│
├── frontend/                   # React 프론트엔드
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   ├── utils/
│   │   │   └── constants.ts
│   │   └── styles/
│   │       └── globals.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── README.md
│
├── docs/                       # 마이그레이션 문서
│   ├── migration-plan.md       # 상세 계획
│   ├── api-mapping.md          # API 매핑 가이드
│   └── component-mapping.md    # 컴포넌트 매핑 가이드
│
├── README.md                   # 프로젝트 개요
└── GETTING_STARTED.md          # 현재 파일
```

---

## 🚀 빠른 시작

### 1. 백엔드 (Spring Boot) 실행

```bash
# react-migration/backend 디렉토리로 이동
cd backend

# Maven 의존성 설치 및 빌드
mvn clean install

# 개발 모드로 실행
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# 서버 확인
curl http://localhost:8080/actuator/health
```

**백엔드 서버**: http://localhost:8080

### 2. 프론트엔드 (React) 실행

```bash
# react-migration/frontend 디렉토리로 이동
cd frontend

# npm 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

**프론트엔드 서버**: http://localhost:3000

---

## 📋 사전 준비

### 필수 도구

1. **Java 17 이상**
   ```bash
   java -version
   # java version "17.x.x" 이상 확인
   ```

2. **Maven 3.6 이상**
   ```bash
   mvn -version
   ```

3. **Node.js 18 이상**
   ```bash
   node -version
   npm -version
   ```

### Firebase 설정

1. **Firebase 서비스 계정 키 다운로드**
   - Firebase Console → Project Settings → Service Accounts
   - "Generate New Private Key" 클릭
   - `firebase-service-account.json` 다운로드

2. **백엔드에 키 파일 배치**
   ```bash
   # backend/src/main/resources/ 디렉토리에 복사
   cp ~/Downloads/firebase-service-account.json backend/src/main/resources/
   ```

3. **환경 변수 설정** (선택적)
   ```bash
   # .env 파일 생성
   export JWT_SECRET=your-super-secret-jwt-key-here
   export FIREBASE_CREDENTIALS=classpath:firebase-service-account.json
   ```

---

## 🔧 개발 환경 설정

### IDE 추천

- **백엔드**: IntelliJ IDEA
- **프론트엔드**: VS Code

### VS Code 확장 프로그램

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### IntelliJ IDEA 플러그인

- Lombok
- Spring Boot Assistant
- .ignore

---

## 📝 개발 워크플로우

### 1. 백엔드 API 개발

```bash
# 1. 컨트롤러 생성
backend/src/main/java/com/logicore/eduverse/controller/AuthController.java

# 2. 서비스 로직 구현
backend/src/main/java/com/logicore/eduverse/service/AuthService.java

# 3. DTO 정의
backend/src/main/java/com/logicore/eduverse/dto/LoginRequest.java

# 4. 테스트 작성
backend/src/test/java/com/logicore/eduverse/controller/AuthControllerTest.java

# 5. 실행 및 테스트
mvn spring-boot:run
curl -X POST http://localhost:8080/api/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password"}'
```

### 2. 프론트엔드 컴포넌트 개발

```bash
# 1. 컴포넌트 생성
frontend/src/components/auth/LoginForm.tsx

# 2. 타입 정의
frontend/src/types/user.ts

# 3. API 서비스 구현
frontend/src/services/authService.ts

# 4. 훅 생성
frontend/src/hooks/useAuth.ts

# 5. 실행 및 테스트
npm run dev
# http://localhost:3000 접속
```

---

## 🧪 테스트

### 백엔드 테스트

```bash
cd backend

# 모든 테스트 실행
mvn test

# 특정 테스트 실행
mvn test -Dtest=AuthControllerTest

# 통합 테스트 실행
mvn verify
```

### 프론트엔드 테스트

```bash
cd frontend

# 유닛 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 테스트 커버리지
npm run test:coverage
```

---

## 🏗️ 빌드 및 배포

### 백엔드 빌드

```bash
cd backend

# JAR 파일 생성
mvn clean package

# Docker 이미지 빌드
docker build -t eduverse-backend:latest .

# Docker 실행
docker run -p 8080:8080 eduverse-backend:latest
```

### 프론트엔드 빌드

```bash
cd frontend

# 프로덕션 빌드
npm run build

# dist/ 디렉토리에 빌드 결과 생성

# Docker 이미지 빌드
docker build -t eduverse-frontend:latest .

# Docker 실행
docker run -p 3000:80 eduverse-frontend:latest
```

---

## 📚 추가 문서

- [마이그레이션 상세 계획](./docs/migration-plan.md)
- [API 매핑 가이드](./docs/api-mapping.md)
- [컴포넌트 매핑 가이드](./docs/component-mapping.md)
- [백엔드 README](./backend/README.md)
- [프론트엔드 README](./frontend/README.md)

---

## 🐛 트러블슈팅

### 백엔드 문제

**문제**: Firebase 초기화 실패
```
Error: Failed to initialize Firebase
```

**해결**:
```bash
# firebase-service-account.json 파일 확인
ls backend/src/main/resources/firebase-service-account.json

# 파일이 없으면 Firebase Console에서 다시 다운로드
```

**문제**: Maven 의존성 다운로드 실패
```
Error: Could not resolve dependencies
```

**해결**:
```bash
# Maven 캐시 정리 후 재시도
mvn clean
mvn dependency:purge-local-repository
mvn install
```

### 프론트엔드 문제

**문제**: npm install 실패
```
Error: Cannot find module
```

**해결**:
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

**문제**: Pyodide 로딩 실패
```
Error: Failed to load Pyodide
```

**해결**:
- 인터넷 연결 확인 (CDN에서 로드)
- 브라우저 콘솔에서 에러 메시지 확인
- 캐시 클리어 후 재시도

---

## 💡 유용한 명령어

### 백엔드

```bash
# 핫 리로드 활성화
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005"

# 프로파일 지정 실행
mvn spring-boot:run -Dspring-boot.run.profiles=prod

# 로그 레벨 변경
mvn spring-boot:run -Dlogging.level.root=DEBUG
```

### 프론트엔드

```bash
# 특정 포트로 실행
npm run dev -- --port 3001

# 프로덕션 미리보기
npm run preview

# 타입 체크만 실행
npx tsc --noEmit
```

---

## 📞 지원

질문이나 문제가 있으시면:
1. [Issues](../../issues) 페이지에 이슈 등록
2. 프로젝트 위키 참조
3. 개발팀에 문의

---

## 📄 라이선스

EduVerse 원본 프로젝트와 동일한 라이선스 적용

---

**Happy Coding! 🚀**
