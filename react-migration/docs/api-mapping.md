# API 매핑 가이드: Flask → Spring Boot

이 문서는 Flask의 각 API 엔드포인트를 Spring Boot로 매핑하는 방법을 상세히 설명합니다.

---

## 1. 인증 API

### 1.1 회원가입

#### Flask (AS-IS)
```python
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()
    name = data['name']
    email = data['email']
    password = data['password']
    role = data.get('role', 'student')

    password_hash = generate_password_hash(password)
    users_ref.document(email).set({
        'name': name,
        'email': email,
        'passwordHash': password_hash,
        'role': role,
        'progress': {'week': 1, 'cycle': 0}
    })
    return jsonify({"status": "success"}), 201
```

#### Spring Boot (TO-BE)
```java
// DTO
@Data
public class SignupRequest {
    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 2)
    private String name;

    @NotBlank
    @Size(min = 6)
    private String password;

    @NotBlank
    private String role; // "student" or "instructor"
}

@Data
@Builder
public class ApiResponse<T> {
    private String status;
    private String message;
    private T data;

    public static <T> ApiResponse<T> success(String message, T data) {
        return ApiResponse.<T>builder()
            .status("success")
            .message(message)
            .data(data)
            .build();
    }
}

// Controller
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<Void>> signup(
        @Valid @RequestBody SignupRequest request
    ) {
        authService.signup(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("회원가입이 완료되었습니다.", null));
    }
}

// Service
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public void signup(SignupRequest request) {
        // 이메일 중복 확인
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateEmailException("이미 가입된 이메일입니다.");
        }

        // 사용자 생성
        User user = User.builder()
            .email(request.getEmail())
            .name(request.getName())
            .passwordHash(passwordEncoder.encode(request.getPassword()))
            .role(UserRole.valueOf(request.getRole().toUpperCase()))
            .progress(Progress.initial())
            .lastSeenIntroWeek(0)
            .seenCodingIntros(new ArrayList<>())
            .build();

        userRepository.save(user);
    }
}

// Repository
@Repository
public class UserRepository {

    private final Firestore firestore;

    public boolean existsByEmail(String email) {
        try {
            return firestore.collection("users")
                .document(email)
                .get()
                .get()
                .exists();
        } catch (Exception e) {
            throw new RuntimeException("Error checking user existence", e);
        }
    }

    public void save(User user) {
        try {
            firestore.collection("users")
                .document(user.getEmail())
                .set(user)
                .get();
        } catch (Exception e) {
            throw new RuntimeException("Error saving user", e);
        }
    }
}
```

### 1.2 로그인

#### Flask (AS-IS)
```python
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data['email']
    password = data['password']

    user_doc = db.collection('users').document(email).get()
    user_data = user_doc.to_dict()

    if check_password_hash(user_data['passwordHash'], password):
        return jsonify({"status": "success", "user": user_data})
    else:
        return jsonify({"status": "error"}), 401
```

#### Spring Boot (TO-BE)
```java
// DTO
@Data
public class LoginRequest {
    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String password;
}

@Data
@Builder
public class LoginResponse {
    private String token;
    private UserResponse user;
}

@Data
@Builder
public class UserResponse {
    private String email;
    private String name;
    private String role;
    private Progress progress;
    private Boolean showWeeklyIntro;
    private List<String> seenCodingIntros;
    private String classId;
}

// Controller
@PostMapping("/login")
public ResponseEntity<ApiResponse<LoginResponse>> login(
    @Valid @RequestBody LoginRequest request
) {
    LoginResponse response = authService.login(request);
    return ResponseEntity.ok(
        ApiResponse.success("로그인 성공!", response)
    );
}

// Service
public LoginResponse login(LoginRequest request) {
    // 사용자 조회
    User user = userRepository.findByEmail(request.getEmail())
        .orElseThrow(() -> new InvalidCredentialsException(
            "이메일 또는 비밀번호가 올바르지 않습니다."
        ));

    // 비밀번호 검증
    if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
        throw new InvalidCredentialsException(
            "이메일 또는 비밀번호가 올바르지 않습니다."
        );
    }

    // 주차 인트로 표시 여부 결정
    boolean showIntro = user.getProgress().getWeek() > user.getLastSeenIntroWeek();
    if (showIntro) {
        user.setLastSeenIntroWeek(user.getProgress().getWeek());
        userRepository.update(user);
    }

    // JWT 토큰 생성
    String token = jwtTokenProvider.createToken(user.getEmail(), user.getRole());

    // 응답 생성
    return LoginResponse.builder()
        .token(token)
        .user(UserResponse.from(user, showIntro))
        .build();
}

// JWT Provider
@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration}")
    private long expiration;

    public String createToken(String email, UserRole role) {
        Claims claims = Jwts.claims().setSubject(email);
        claims.put("role", role.name());

        Date now = new Date();
        Date validity = new Date(now.getTime() + expiration);

        return Jwts.builder()
            .setClaims(claims)
            .setIssuedAt(now)
            .setExpiration(validity)
            .signWith(SignatureAlgorithm.HS256, secretKey)
            .compact();
    }

    public String getEmailFromToken(String token) {
        return Jwts.parser()
            .setSigningKey(secretKey)
            .parseClaimsJws(token)
            .getBody()
            .getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().setSigningKey(secretKey).parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
```

---

## 2. 시나리오 API

### 2.1 주차별 시나리오 조회

#### Flask (AS-IS)
```python
@app.route('/api/scenario/week/<int:week_num>')
def get_scenario(week_num):
    doc_id = f'week_{week_num}'
    scenario_doc = db.collection('scenarios').document(doc_id).get()
    if scenario_doc.exists:
        return jsonify(scenario_doc.to_dict())
    else:
        return jsonify({"status": "error"}), 404
```

#### Spring Boot (TO-BE)
```java
// Model
@Data
@Builder
public class Scenario {
    private Integer week;
    private String title;
    private List<Cycle> cycles;
}

@Data
@Builder
public class Cycle {
    private String title;
    private String syntaxKey;
    private String filename;
    private String starterCode;
    private String testCode;
    private Task task;
    private Briefing briefing;
    private Lecture lecture;
    private Feedback feedback;
}

// Controller
@RestController
@RequestMapping("/api/scenario")
@RequiredArgsConstructor
public class ScenarioController {

    private final ScenarioService scenarioService;

    @GetMapping("/week/{weekNum}")
    public ResponseEntity<Scenario> getScenario(@PathVariable Integer weekNum) {
        Scenario scenario = scenarioService.getScenario(weekNum);
        return ResponseEntity.ok(scenario);
    }
}

// Service
@Service
@RequiredArgsConstructor
public class ScenarioService {

    private final ScenarioRepository scenarioRepository;

    @Cacheable(value = "scenarios", key = "#weekNum")
    public Scenario getScenario(Integer weekNum) {
        return scenarioRepository.findByWeek(weekNum)
            .orElseThrow(() -> new ScenarioNotFoundException(
                "해당 주차의 시나리오를 찾을 수 없습니다."
            ));
    }
}

// Repository
@Repository
@RequiredArgsConstructor
public class ScenarioRepository {

    private final Firestore firestore;
    private final ObjectMapper objectMapper;

    public Optional<Scenario> findByWeek(Integer week) {
        try {
            DocumentSnapshot doc = firestore.collection("scenarios")
                .document("week_" + week)
                .get()
                .get();

            if (!doc.exists()) {
                return Optional.empty();
            }

            Scenario scenario = objectMapper.convertValue(
                doc.getData(),
                Scenario.class
            );
            return Optional.of(scenario);
        } catch (Exception e) {
            throw new RuntimeException("Error fetching scenario", e);
        }
    }
}
```

---

## 3. 진행도 관리 API

### 3.1 진행도 업데이트

#### Flask (AS-IS)
```python
@app.route('/api/progress/update', methods=['POST'])
def update_progress():
    data = request.get_json()
    email = data['email']
    progress = data['progress']

    db.collection('users').document(email).update({'progress': progress})
    return jsonify({"status": "success"})
```

#### Spring Boot (TO-BE)
```java
// DTO
@Data
public class UpdateProgressRequest {
    @NotBlank
    @Email
    private String email;

    @NotNull
    @Valid
    private Progress progress;
}

@Data
public class Progress {
    @Min(1)
    @Max(12)
    private Integer week;

    @Min(0)
    private Integer cycle;

    public static Progress initial() {
        Progress progress = new Progress();
        progress.setWeek(1);
        progress.setCycle(0);
        return progress;
    }
}

// Controller
@RestController
@RequestMapping("/api/progress")
@RequiredArgsConstructor
public class ProgressController {

    private final ProgressService progressService;

    @PostMapping("/update")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Void>> updateProgress(
        @Valid @RequestBody UpdateProgressRequest request
    ) {
        progressService.updateProgress(request);
        return ResponseEntity.ok(
            ApiResponse.success("진행 상황이 저장되었습니다.", null)
        );
    }
}

// Service
@Service
@RequiredArgsConstructor
public class ProgressService {

    private final UserRepository userRepository;

    public void updateProgress(UpdateProgressRequest request) {
        userRepository.updateProgress(
            request.getEmail(),
            request.getProgress()
        );
    }
}
```

### 3.2 라이브 코드 업데이트

#### Flask (AS-IS)
```python
@app.route('/api/livecode/update', methods=['POST'])
def update_live_code():
    data = request.get_json()
    email = data.get('email')
    live_code = data.get('liveCode')

    db.collection('users').document(email).set({
        'liveCode': live_code,
        'lastActive': firestore.SERVER_TIMESTAMP
    }, merge=True)
    return jsonify({"status": "success"})
```

#### Spring Boot (TO-BE)
```java
// DTO
@Data
public class UpdateLiveCodeRequest {
    @NotBlank
    @Email
    private String email;

    private String liveCode;
}

// Controller
@PostMapping("/livecode/update")
@PreAuthorize("hasRole('STUDENT')")
public ResponseEntity<ApiResponse<Void>> updateLiveCode(
    @Valid @RequestBody UpdateLiveCodeRequest request
) {
    progressService.updateLiveCode(request);
    return ResponseEntity.ok(
        ApiResponse.success("라이브 코드가 업데이트되었습니다.", null)
    );
}

// Service
public void updateLiveCode(UpdateLiveCodeRequest request) {
    Map<String, Object> updates = Map.of(
        "liveCode", request.getLiveCode(),
        "lastActive", FieldValue.serverTimestamp()
    );
    userRepository.updateFields(request.getEmail(), updates);
}
```

---

## 4. 클래스 관리 API

### 4.1 클래스 생성

#### Flask (AS-IS)
```python
@app.route('/api/classes/create', methods=['POST'])
def create_class():
    data = request.get_json()
    class_details = data.get('classDetails')
    instructor_email = data.get('instructorEmail')

    invite_code = generate_invite_code()
    class_id = db.collection('classes').document().id
    new_class_data = {
        'classId': class_id,
        'className': f"[{year} {semester}] {subject}...",
        'inviteCode': invite_code,
        'students': [],
        'createdAt': firestore.SERVER_TIMESTAMP
    }
    db.collection('classes').document(class_id).set(new_class_data)
    return jsonify({"status": "success", "class": new_class_data}), 201
```

#### Spring Boot (TO-BE)
```java
// DTO
@Data
public class CreateClassRequest {
    @NotBlank
    @Email
    private String instructorEmail;

    @NotNull
    @Valid
    private ClassDetails classDetails;
}

@Data
public class ClassDetails {
    @NotBlank
    private String subject;
    private String year = "2025";
    private String semester = "1학기";
    private String department;
    private String section = "01";
}

@Data
@Builder
public class ClassResponse {
    private String classId;
    private String className;
    private String inviteCode;
    private List<String> students;
}

// Model
@Data
@Builder
public class ClassEntity {
    private String classId;
    private String className;
    private ClassDetails details;
    private String instructorEmail;
    private String inviteCode;
    private List<String> students;
    private Date createdAt;
}

// Controller
@RestController
@RequestMapping("/api/classes")
@RequiredArgsConstructor
public class ClassController {

    private final ClassService classService;

    @PostMapping("/create")
    @PreAuthorize("hasRole('INSTRUCTOR')")
    public ResponseEntity<ApiResponse<ClassResponse>> createClass(
        @Valid @RequestBody CreateClassRequest request
    ) {
        ClassResponse classResponse = classService.createClass(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("새로운 수업이 개설되었습니다.", classResponse));
    }
}

// Service
@Service
@RequiredArgsConstructor
public class ClassService {

    private final ClassRepository classRepository;
    private final InviteCodeGenerator inviteCodeGenerator;

    public ClassResponse createClass(CreateClassRequest request) {
        ClassDetails details = request.getClassDetails();

        // 클래스명 생성
        String className = String.format(
            "[%s %s] %s (%s %s분반)",
            details.getYear(),
            details.getSemester(),
            details.getSubject(),
            details.getDepartment(),
            details.getSection()
        );

        // 초대 코드 생성
        String inviteCode = inviteCodeGenerator.generate();

        // 클래스 엔티티 생성
        ClassEntity classEntity = ClassEntity.builder()
            .classId(UUID.randomUUID().toString())
            .className(className)
            .details(details)
            .instructorEmail(request.getInstructorEmail())
            .inviteCode(inviteCode)
            .students(new ArrayList<>())
            .createdAt(new Date())
            .build();

        classRepository.save(classEntity);

        return ClassResponse.from(classEntity);
    }
}

// Util
@Component
public class InviteCodeGenerator {
    private static final String CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int LENGTH = 6;
    private final SecureRandom random = new SecureRandom();

    public String generate() {
        StringBuilder code = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            code.append(CHARS.charAt(random.nextInt(CHARS.length())));
        }
        return code.toString();
    }
}
```

---

## 5. 완전한 API 매핑 테이블

| Flask 엔드포인트 | HTTP Method | Spring Boot 엔드포인트 | Controller | 주요 변경사항 |
|------------------|-------------|------------------------|------------|--------------|
| `/api/signup` | POST | `/api/signup` | AuthController | JWT 토큰 발급 추가 |
| `/api/login` | POST | `/api/login` | AuthController | JWT 기반 인증 |
| `/api/scenario/week/<week>` | GET | `/api/scenario/week/{week}` | ScenarioController | 캐싱 추가 |
| `/api/progress/update` | POST | `/api/progress/update` | ProgressController | 검증 강화 |
| `/api/livecode/update` | POST | `/api/livecode/update` | ProgressController | - |
| `/api/pause/set` | POST | `/api/pause/set` | ProgressController | - |
| `/api/pause/clear` | POST | `/api/pause/clear` | ProgressController | - |
| `/api/classes` | GET | `/api/classes` | ClassController | - |
| `/api/classes/create` | POST | `/api/classes/create` | ClassController | - |
| `/api/classes/delete` | POST | `/api/classes/delete` | ClassController | - |
| `/api/classes/join` | POST | `/api/classes/join` | ClassController | - |
| `/api/class/<classId>` | GET | `/api/class/{classId}` | ClassController | - |
| `/api/question/ask` | POST | `/api/question/ask` | QuestionController | - |
| `/api/question/answer` | POST | `/api/question/answer` | QuestionController | - |
| `/api/questions/my` | GET | `/api/questions/my` | QuestionController | - |
| `/api/log/submission` | POST | `/api/log/submission` | LogController | - |
| `/api/log/reflection` | POST | `/api/log/reflection` | LogController | - |
| `/api/analytics/class/<classId>` | GET | `/api/analytics/class/{classId}` | AnalyticsController | - |
| `/api/analytics/my-growth` | GET | `/api/analytics/my-growth` | AnalyticsController | - |
| `/api/coding-intro/seen` | POST | `/api/coding-intro/seen` | ProgressController | - |

---

## 6. 공통 패턴

### 6.1 예외 처리

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ApiResponse<Void>> handleDuplicateEmail(
        DuplicateEmailException e
    ) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiResponse.error(e.getMessage()));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidCredentials(
        InvalidCredentialsException e
    ) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(ApiResponse.error(e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidation(
        MethodArgumentNotValidException e
    ) {
        Map<String, String> errors = e.getBindingResult()
            .getFieldErrors()
            .stream()
            .collect(Collectors.toMap(
                FieldError::getField,
                FieldError::getDefaultMessage
            ));

        return ResponseEntity.badRequest()
            .body(ApiResponse.error("입력 검증 실패", errors));
    }
}
```

### 6.2 JWT 인증 필터

```java
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {

        String token = extractToken(request);

        if (token != null && tokenProvider.validateToken(token)) {
            String email = tokenProvider.getEmailFromToken(token);
            UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(email, null, null);
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
```

---

## 다음 단계

→ [컴포넌트 매핑 가이드](./component-mapping.md)
