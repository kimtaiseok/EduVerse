# EduVerse Backend (Spring Boot)

EduVerse 학습 플랫폼의 Spring Boot 기반 백엔드 API 서버입니다.

## 기술 스택

- **Java**: 17
- **Spring Boot**: 3.2.1
- **Spring Security**: JWT 기반 인증
- **Firebase Admin SDK**: 9.2.0 (Firestore 연동)
- **Maven**: 빌드 도구
- **Lombok**: 보일러플레이트 코드 감소

## 시작하기

### 사전 요구사항

- Java 17 이상
- Maven 3.6 이상
- Firebase 서비스 계정 JSON 파일

### 로컬 실행

```bash
# 의존성 설치 및 빌드
mvn clean install

# 개발 모드로 실행
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# 또는
./mvnw spring-boot:run
```

서버가 `http://localhost:8080`에서 실행됩니다.

### 환경 변수 설정

```bash
# .env 파일 생성 (루트 디렉토리)
JWT_SECRET=your-secret-key-here
FIREBASE_CREDENTIALS=/path/to/firebase-service-account.json
```

## 프로젝트 구조

```
src/main/java/com/logicore/eduverse/
├── EduverseApplication.java          # 메인 애플리케이션
├── config/                            # 설정
│   ├── FirebaseConfig.java
│   ├── SecurityConfig.java
│   ├── CorsConfig.java
│   └── WebMvcConfig.java
├── controller/                        # REST 컨트롤러
│   ├── AuthController.java
│   ├── ScenarioController.java
│   ├── ProgressController.java
│   ├── ClassController.java
│   ├── QuestionController.java
│   └── AnalyticsController.java
├── service/                           # 비즈니스 로직
│   ├── AuthService.java
│   ├── UserService.java
│   └── ...
├── model/                             # 도메인 모델
│   ├── User.java
│   ├── Scenario.java
│   └── ...
├── dto/                               # Data Transfer Objects
│   ├── request/
│   └── response/
├── repository/                        # 데이터 접근
│   └── FirestoreRepository.java
├── security/                          # 보안
│   ├── JwtTokenProvider.java
│   └── JwtAuthenticationFilter.java
├── exception/                         # 예외 처리
│   └── GlobalExceptionHandler.java
└── util/                              # 유틸리티
    └── InviteCodeGenerator.java
```

## API 엔드포인트

### 인증
- `POST /api/signup` - 회원가입
- `POST /api/login` - 로그인

### 시나리오
- `GET /api/scenario/week/{weekNum}` - 주차별 시나리오 조회

### 진행도
- `POST /api/progress/update` - 진행도 업데이트
- `POST /api/livecode/update` - 라이브 코드 업데이트

### 클래스
- `GET /api/classes` - 클래스 목록
- `POST /api/classes/create` - 클래스 생성
- `POST /api/classes/join` - 클래스 참여

### Q&A
- `POST /api/question/ask` - 질문 등록
- `GET /api/questions/my` - 내 질문 조회

### 분석
- `GET /api/analytics/class/{classId}` - 클래스 분석
- `GET /api/analytics/my-growth` - 성장 분석

## 빌드 및 배포

### JAR 빌드

```bash
mvn clean package
java -jar target/eduverse-2.0.0.jar
```

### Docker 빌드

```bash
docker build -t eduverse-backend .
docker run -p 8080:8080 eduverse-backend
```

## 테스트

```bash
# 모든 테스트 실행
mvn test

# 특정 테스트 클래스만 실행
mvn test -Dtest=AuthControllerTest
```

## 라이선스

EduVerse 원본 프로젝트와 동일한 라이선스 적용
