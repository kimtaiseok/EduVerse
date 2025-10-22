-- ----------------------------
-- Table structure for TBL_USER
-- ----------------------------
CREATE TABLE `TBL_USER` (
                            `USER_ID`	BIGINT	NOT NULL AUTO_INCREMENT COMMENT '사용자 일련번호',
                            `ROLE`	ENUM('STUDENT', 'PROFESSOR', 'ADMIN')	NOT NULL	DEFAULT 'STUDENT'	COMMENT '역할',
                            `NAME`	VARCHAR(100)	NOT NULL	COMMENT '이름',
                            `EMAIL`	VARCHAR(100)	NOT NULL	COMMENT '이메일',
                            `PASSWORD_HASH`	VARCHAR(150)	NOT NULL	COMMENT '비밀번호',
                            `STUDENT_NUM`	INT(10)	NOT NULL	COMMENT '학번',
                            `STATUS`	TINYINT	NULL	COMMENT '상태',
                            `CREATE_DT`	DATETIME	NOT NULL,
                            `UPDATE_DT`	DATETIME	NOT NULL,
                            PRIMARY KEY (`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_CURRICULUM
-- ----------------------------
CREATE TABLE `TBL_CURRICULUM` (
                                  `CUR_ID`	BIGINT	NOT NULL AUTO_INCREMENT COMMENT '커리큘럼 식별자',
                                  `LANG`	VARCHAR(100)	NOT NULL,
                                  `NAME`	VARCHAR(100)	NOT NULL	COMMENT '커리큘럼 명',
                                  `DESCRIPTION`	VARCHAR(255)	NULL	COMMENT '커리큘럼 설명',
                                  `DURATION_WEEKS`	INT(10)	NOT NULL	COMMENT '기본 주차 수',
                                  `CREATE_DT`	DATETIME	NOT NULL,
                                  `UPDATE_DT`	DATETIME	NOT NULL,
                                  PRIMARY KEY (`CUR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_CURRICULUM_WEEK
-- ----------------------------
CREATE TABLE `TBL_CURRICULUM_WEEK` (
                                       `CUR_WEEK_ID`	BIGINT	NOT NULL	COMMENT '커리큘럼 주차 식별자',
                                       `CUR_ID`	BIGINT	NOT NULL	COMMENT '커리큘럼 식별자',
                                       `WEEK_NO`	INT(10)	NOT NULL	COMMENT '주차 번호',
                                       `TITLE`	VARCHAR(200)	NOT NULL	COMMENT '주차 제목',
                                       `SUBTITLE`	VARCHAR(200)	NULL	COMMENT '주차 부제목',
                                       `CONTENT`	VARCHAR(500)	NULL	COMMENT '주차 내용',
                                       `CUR_LEV`	INT(10)	NOT NULL	COMMENT '독백을 나누기 위한 레벨',
                                       `CHARACTER_NM`	VARCHAR(50)	NULL	COMMENT '캐릭터 명',
                                       `CREATE_DT`	DATETIME	NOT NULL,
                                       PRIMARY KEY (`CUR_WEEK_ID`, `CUR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_SYNTAX
-- ----------------------------
CREATE TABLE `TBL_SYNTAX` (
                              `SYNTAX_ID`	BIGINT	NOT NULL AUTO_INCREMENT COMMENT '문법 식별코드',
                              `SYNTAX_KEY`	VARCHAR(100)	NOT NULL	COMMENT '문법 고유 키',
                              `NAME`	VARCHAR(200)	NOT NULL	COMMENT '문법 표시 이름',
                              `DESCRIPTION`	VARCHAR(500)	NULL	COMMENT '문법 상세 설명',
                              `CATEGORY`	VARCHAR(100)	NULL	COMMENT '문법 카테고리',
                              `CREATE_DT`	DATETIME	NOT NULL,
                              PRIMARY KEY (`SYNTAX_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_CYCLE
-- ----------------------------
CREATE TABLE `TBL_CYCLE` (
                             `CYCLE_ID`	BIGINT	NOT NULL,
                             `CUR_WEEK_ID`	BIGINT	NOT NULL	COMMENT '커리큘럼 주차 식별자',
                             `SYNTAX_ID`	BIGINT	NOT NULL	COMMENT '문법 식별코드',
                             `CYCLE_TITLE`	VARCHAR(500)	NULL,
                             `FILE_NM`	VARCHAR(200)	NULL	COMMENT '컴파일 파일 명',
                             PRIMARY KEY (`CYCLE_ID`, `CUR_WEEK_ID`, `SYNTAX_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_TASK
-- ----------------------------
CREATE TABLE `TBL_TASK` (
                            `TASK_ID`	BIGINT	NOT NULL	COMMENT '과제/문항 식별자',
                            `CYCLE_ID`	BIGINT	NOT NULL,
                            `TASK_MODE`	ENUM('ADVANCE', 'EASY')	NULL	COMMENT '경험유무(Advance, Easy)',
                            `CONFIG_JSON`	JSON	NULL	COMMENT '컴파일 설정',
                            `ORDER_NO`	INT(10)	NOT NULL	COMMENT '주차 내 표시 순서',
                            `CREATE_DT`	DATETIME	NOT NULL,
                            `UPDATE_DT`	DATETIME	NOT NULL,
                            PRIMARY KEY (`TASK_ID`, `CYCLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_CLASS
-- ----------------------------
CREATE TABLE `TBL_CLASS` (
                             `CLASS_ID`	BIGINT	NOT NULL AUTO_INCREMENT COMMENT '수업 식별자',
                             `CLASS_NM`	VARCHAR(200)	NOT NULL	COMMENT '수업명',
                             `DESCRIPTION`	VARCHAR(500)	NULL	COMMENT '수업 설명',
                             `YEAR`	INT(10)	NOT NULL	COMMENT '개설 연도',
                             `TERM`	VARCHAR(20)	NOT NULL	COMMENT '학기',
                             `CURRENT_INVITE_ID`	VARCHAR(100)	NULL	COMMENT '현재 활성 초대 코드 ID(지속적 갱신)',
                             `USE_YN`	TINYINT	NOT NULL	DEFAULT 0	COMMENT '사용 여부',
                             `CREATE_DT`	DATETIME	NOT NULL,
                             `UPDATE_DT`	DATETIME	NOT NULL,
                             `USER_ID`	BIGINT	NOT NULL	COMMENT '사용자 일련번호',
                             PRIMARY KEY (`CLASS_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_CLASS_INVITE
-- ----------------------------
CREATE TABLE `TBL_CLASS_INVITE` (
                                    `INVITE_ID`	BIGINT	NOT NULL AUTO_INCREMENT COMMENT '초대코드 식별자',
                                    `INVITE_CD`	VARCHAR(20)	NOT NULL	COMMENT '초대코드',
                                    `QR_CD`	VARCHAR(500)	NULL	COMMENT 'QR코드',
                                    `ACTIVE_YN`	TINYINT(1)	NOT NULL	DEFAULT 1	COMMENT '활성 여부',
                                    `CREATE_DT`	DATETIME	NOT NULL,
                                    `UPDATE_DT`	DATETIME	NOT NULL,
                                    `CLASS_ID`	BIGINT	NOT NULL	COMMENT '수업 식별자',
                                    PRIMARY KEY (`INVITE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_WEEKLY_SESSION
-- ----------------------------
CREATE TABLE `TBL_WEEKLY_SESSION` (
                                      `WEEKLY_SESSION_ID`	BIGINT	NOT NULL	COMMENT '주차 별 수업 인스턴스 식별 번호',
                                      `INVITE_ID`	BIGINT	NOT NULL	COMMENT '초대코드 식별자',
                                      `WEEK_NO`	INT(10)	NOT NULL	COMMENT '해당 수업 내 주차 번호',
                                      `STATUS`	ENUM('PENDING', 'IN_PROGRESS', 'ENDED')	NOT NULL	DEFAULT 'PENDING'	COMMENT '수업 상태(시작 전, 진행 중, 종료됨)',
                                      `START_DT`	DATETIME	NULL	COMMENT '수업 시작 시각',
                                      `AUTO_CLOSED`	TINYINT(1)	NOT NULL	DEFAULT 1	COMMENT '24 시간 자동 종료 여부',
                                      `CREATE_DT`	DATETIME	NOT NULL,
                                      `UPDATE_DT`	DATETIME	NOT NULL,
                                      PRIMARY KEY (`WEEKLY_SESSION_ID`, `INVITE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_LECTURE
-- ----------------------------
CREATE TABLE `TBL_LECTURE` (
                               `LECTURE_ID`	BIGINT	NOT NULL,
                               `TASK_ID`	BIGINT	NOT NULL	COMMENT '과제/문항 식별자',
                               `CHARACTER_IMG`	VARCHAR(500)	NOT NULL	COMMENT '캐릭터 이미지(파일명)',
                               `CHARACTER_PATH`	VARCHAR(500)	NOT NULL	COMMENT '캐릭터 이미지 경로',
                               `TITLE`	VARCHAR(100)	NOT NULL	COMMENT '강의 노트 제목',
                               `KEY_TAKEAWAY`	VARCHAR(500)	NOT NULL	COMMENT 'Summary 역할?',
                               `SANDBOX_CODE`	VARCHAR(500)	NOT NULL	COMMENT 'CODE Description',
                               PRIMARY KEY (`LECTURE_ID`, `TASK_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_LECTURE_SECTION
-- ----------------------------
CREATE TABLE `TBL_LECTURE_SECTION` (
                                       `LECTURE_SECTION_ID`	BIGINT	NOT NULL,
                                       `LECTURE_ID`	BIGINT	NOT NULL,
                                       `HEADING`	VARCHAR(200)	NOT NULL	COMMENT '개요 타이틀',
                                       `LECTURE_SECTION_TXT`	VARCHAR(500)	NOT NULL,
                                       `LECTURE_SECTION_CODE`	MEDIUMTEXT	NULL	DEFAULT NULL	COMMENT '예제 코드',
                                       `CREATE_DT`	DATETIME	NOT NULL,
                                       PRIMARY KEY (`LECTURE_SECTION_ID`, `LECTURE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_QUESTION
-- ----------------------------
CREATE TABLE `TBL_QUESTION` (
                                `QUESTION_ID`	BIGINT	NOT NULL	COMMENT '질문 식별번호',
                                `CLASS_ID`	BIGINT	NOT NULL	COMMENT '수업 식별자',
                                `WEEKLY_SESSION_ID`	BIGINT	NOT NULL	COMMENT '주차 별 수업 인스턴스 식별 번호',
                                `INVITE_ID`	BIGINT	NOT NULL	COMMENT '초대코드 식별자',
                                `URGENCY`	ENUM('HIGH', 'MEDIUM', 'LOW')	NOT NULL	DEFAULT 'MEDIUM'	COMMENT '우선순위 (HIGH, MEDIUM, LOW)',
                                `TITLE`	VARCHAR(200)	NOT NULL	COMMENT '질문 제목',
                                `CONTENT`	VARCHAR(500)	NOT NULL	COMMENT '질문 내용',
                                `STATUS`	ENUM('OPEN', 'ANSWERED', 'CLOSED')	NOT NULL	DEFAULT 'OPEN' COMMENT '상태 (OPEN, ANSWERED, CLOSED)',
                                `CREATE_DT`	DATETIME	NOT NULL,
                                `USER_ID`	BIGINT	NOT NULL	COMMENT '사용자 일련번호',
                                PRIMARY KEY (`QUESTION_ID`, `CLASS_ID`, `WEEKLY_SESSION_ID`, `INVITE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_CLASS_SUBMIT
-- ----------------------------
CREATE TABLE `TBL_CLASS_SUBMIT` (
                                    `SUBMIT_ID`	BIGINT	NOT NULL	COMMENT '코드 제출 식별자',
                                    `TASK_ID`	BIGINT	NOT NULL	COMMENT '과제/문항 식별자',
                                    `CLASS_ID`	BIGINT	NOT NULL	COMMENT '수업 식별자',
                                    `WEEKLY_SESSION_ID`	BIGINT	NOT NULL	COMMENT '주차 별 수업 인스턴스 식별 번호',
                                    `CYCLE_ID`	BIGINT	NOT NULL,
                                    `SUBMIT_AT`	DATETIME	NOT NULL	COMMENT '제출 시각',
                                    `RESULT`	TINYINT(1)	NULL	COMMENT '제출 결과',
                                    `SCORE`	DECIMAL(5, 2)	NULL	COMMENT '점수(가중 합산)',
                                    `DETAIL_JSON`	JSON	NULL	COMMENT '실패 케이스/ 로그 등 상세',
                                    `IS_FIRST_EVAL`	TINYINT(1)	NOT NULL	COMMENT '첫 제출 여부',
                                    `SUBMIT_NUM`	INT(10)	NULL	COMMENT '제출 횟수',
                                    `SUBMIT_YN`	TINYINT(1)	NOT NULL	COMMENT '제출 여부 상태(TRUE, FALSE)',
                                    `UPDATE_DT`	DATETIME	NOT NULL,
                                    PRIMARY KEY (`SUBMIT_ID`, `TASK_ID`, `CLASS_ID`, `WEEKLY_SESSION_ID`, `CYCLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_FILE
-- ----------------------------
CREATE TABLE `TBL_FILE` (
                            `FILE_ID`	BIGINT	NOT NULL AUTO_INCREMENT COMMENT '파일 일련번호',
                            `ORG_FILE_NM`	VARCHAR(200)	NOT NULL	COMMENT '원본 파일 명',
                            `SAVE_FILE_NM`	VARCHAR(200)	NOT NULL	COMMENT '저장 파일명',
                            `USE_YN`	TINYINT(1)	NOT NULL	DEFAULT 1	COMMENT '사용 여부',
                            `CREATE_DT`	DATETIME	NOT NULL,
                            `UPDATE_DT`	DATETIME	NOT NULL,
                            PRIMARY KEY (`FILE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_MENTOR_DIALOG
-- ----------------------------
CREATE TABLE `TBL_MENTOR_DIALOG` (
                                     `DIALOG_ID`	BIGINT	NOT NULL	COMMENT '가상 멘토 대화 스크립트 식별코드',
                                     `TASK_ID`	BIGINT	NOT NULL	COMMENT '과제/문항 식별자',
                                     `CYCLE_ID`	BIGINT	NOT NULL,
                                     `MENTOR_TYPE`	INT(10)	NOT NULL	COMMENT '가상 멘토 (교수, 사수)',
                                     `DIALOG_SORT`	INT(10)	NOT NULL	COMMENT '대화 순서',
                                     `CONTENT`	VARCHAR(1000)	NOT NULL	COMMENT '대화 내용',
                                     `DIALOG_TYPE`	INT(10)	NOT NULL	COMMENT '대화 타입(질문, 힌트 등)',
                                     `CREATE_DT`	DATETIME	NOT NULL,
                                     PRIMARY KEY (`DIALOG_ID`, `TASK_ID`, `CYCLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_HINT
-- ----------------------------
CREATE TABLE `TBL_HINT` (
                            `HINT_ID`	BIGINT	NOT NULL	COMMENT '힌트 열람 식별자',
                            `TASK_ID`	BIGINT	NOT NULL	COMMENT '과제/문항 식별자',
                            `TITLE`	VARCHAR(255)	NOT NULL	COMMENT '힌트 제목',
                            `CONTENT`	VARCHAR(500)	NOT NULL	COMMENT '힌트 내용',
                            `VIDEO_URL`	VARCHAR(255)	NULL	COMMENT '교수 요약 강의 영상 URL',
                            `CREATE_DT`	DATETIME	NOT NULL,
                            `UPDATE_DT`	DATETIME	NULL,
                            PRIMARY KEY (`HINT_ID`, `TASK_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_TEST_CASE
-- ----------------------------
CREATE TABLE `TBL_TEST_CASE` (
                                 `TEST_CASE_ID`	BIGINT	NOT NULL	COMMENT '테스트 케이스  식별자',
                                 `TASK_ID`	BIGINT	NOT NULL	COMMENT '과제/문항 식별자',
                                 `CYCLE_ID`	BIGINT	NOT NULL,
                                 `START_CODE`	MEDIUMTEXT	NOT NULL	COMMENT '시작 코드',
                                 `TEST_CODE`	MEDIUMTEXT	NOT NULL	COMMENT '테스트 코드',
                                 `INPUT_TEXT`	VARCHAR(500)	NOT NULL	COMMENT '입력',
                                 `EXPECTED_OUTPUT`	VARCHAR(500)	NOT NULL	COMMENT '예상 출력',
                                 `WEIGHT`	INT(100)	NOT NULL	DEFAULT 1	COMMENT '가중치(채점 비중)',
                                 `CREATE_DT`	DATETIME	NOT NULL,
                                 PRIMARY KEY (`TEST_CASE_ID`, `TASK_ID`, `CYCLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_WORK_LOG
-- ----------------------------
CREATE TABLE `TBL_WORK_LOG` (
                                `WORK_LOG_ID`	BIGINT	NOT NULL	COMMENT '업무일지 식별코드',
                                `USER_ID`	BIGINT	NOT NULL	COMMENT '사용자 일련번호',
                                `WEEK_NUMBER`	INT(10)	NOT NULL	COMMENT '해당 주차',
                                `CONTENT`	VARCHAR(500)	NOT NULL	COMMENT '업무일지 내용',
                                `SELF_EVALUATION`	INT(10)	NOT NULL	COMMENT '자기평가 점수',
                                `COMPLETED_TASK`	VARCHAR(255)	NULL	COMMENT '완료한 작업',
                                `DIFFICULTIES`	VARCHAR(500)	NULL	COMMENT '어려웠던 점',
                                `IMPROVEMENTS`	VARCHAR(500)	NULL	COMMENT '개선 계획',
                                `SUBMIT_DT`	DATETIME	NULL	COMMENT '최초 작성시간',
                                `UPDATE_DT`	DATETIME	NULL	COMMENT '수정시간',
                                PRIMARY KEY (`WORK_LOG_ID`, `USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_CLASS_ENROLL
-- ----------------------------
CREATE TABLE `TBL_CLASS_ENROLL` (
                                    `ENROLL_ID`	BIGINT	NOT NULL AUTO_INCREMENT COMMENT '수업 참여 식별코드',
                                    `STATUS`	ENUM('ACTIVE', 'WITHDRAWN')	NOT NULL	DEFAULT 'ACTIVE'	COMMENT '참여 상태 (ACTIVE, WITHDRAWN)',
                                    `WITHDRAWN_DT`	DATETIME	NULL	COMMENT '탈퇴 처리 일시',
                                    `CREATE_DT`	DATETIME	NOT NULL,
                                    `UPDATE_DT`	DATETIME	NOT NULL,
                                    `CLASS_ID`	BIGINT	NOT NULL	COMMENT '수업 식별자',
                                    `USER_ID`   BIGINT  NOT NULL COMMENT '사용자 식별자', -- 이 컬럼이 누락된 것 같아 추가합니다. PK에도 포함시킵니다.
                                    PRIMARY KEY (`ENROLL_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_ACTIVITY_MONITOR
-- ----------------------------
CREATE TABLE `TBL_ACTIVITY_MONITOR` (
                                        `MONITOR_ID`	BIGINT	NOT NULL	COMMENT '모니터 식별자',
                                        `WEEKLY_SESSION_ID`	BIGINT	NOT NULL	COMMENT '주차 별 수업 인스턴스 식별 번호',
                                        `INVITE_ID`	BIGINT	NOT NULL	COMMENT '초대코드 식별자',
                                        `LAST_SEEN_DT`	DATETIME	NOT NULL	COMMENT '최근 활동 시각',
                                        `LAST_ACTION`	ENUM('ACTIVE', 'IDLE', 'HELP_NEEDED', 'COMPLETED')	NOT NULL	COMMENT '상태 (활동/대기/도움필요/완료)',
                                        `CREATE_DT`	DATETIME	NULL,
                                        `UPDATE_DT`	DATETIME	NULL,
                                        PRIMARY KEY (`MONITOR_ID`, `WEEKLY_SESSION_ID`, `INVITE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_PROGRESS
-- ----------------------------
CREATE TABLE `TBL_PROGRESS` (
                                `PROGRESS_ID`	BIGINT	NOT NULL	COMMENT '수업 진도 식별코드',
                                `CLASS_ID`	BIGINT	NOT NULL	COMMENT '수업 식별자',
                                `WEEKLY_SESSION_ID`	BIGINT	NOT NULL	COMMENT '주차 별 수업 인스턴스 식별 번호',
                                `PROGRESS_PCT`	DECIMAL(5, 2)	NOT NULL	COMMENT '수업 진도율(0~100%)',
                                `COMPLETED_DT`	DATETIME	NULL	COMMENT '주차 완료 시각',
                                `CREATE_DT`	DATETIME	NOT NULL,
                                `UPDATE_DT`	DATETIME	NOT NULL,
                                `USER_ID`	BIGINT	NOT NULL	COMMENT '사용자 일련번호',
                                PRIMARY KEY (`PROGRESS_ID`, `CLASS_ID`, `WEEKLY_SESSION_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_EMAIL_VERIFICATION
-- ----------------------------
CREATE TABLE `TBL_EMAIL_VERIFICATION` (
                                          `VARIFICATION_ID`	BIGINT	NOT NULL	COMMENT '이메일 인증 식별키',
                                          `USER_ID`	BIGINT	NOT NULL	COMMENT '사용자 일련번호',
                                          `CODE`	CHAR(6)	NOT NULL	COMMENT '인증번호',
                                          `EXPIRES_AT`	DATETIME	NOT NULL	COMMENT '인증번호 만료 시각',
                                          `ATTEMPT_COUNT`	TINYINT	NOT NULL	COMMENT '인증 시도 횟수(3번 제한)',
                                          `VERIFIED_AT`	DATETIME	NULL	COMMENT '인증 성공 시각',
                                          `CREATE_DT`	DATETIME	NOT NULL	COMMENT '생성 일시',
                                          PRIMARY KEY (`VARIFICATION_ID`, `USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_AUTH_LOG
-- ----------------------------
CREATE TABLE `TBL_AUTH_LOG` (
                                `AUTH_LOG_ID`	BIGINT	NOT NULL AUTO_INCREMENT COMMENT '사용자 인증 로그 식별코드',
                                `EMAIL`	VARCHAR(200)	NULL	COMMENT '요청 이메일(미가입/익명 처리)',
                                `EVENT`	INT(10)	NOT NULL	COMMENT '접속 유형',
                                `CREATE_DT`	DATETIME	NOT NULL,
                                `UPDATE_DT`	DATETIME	NOT NULL,
                                `USER_ID`	BIGINT	NOT NULL	COMMENT '사용자 일련번호',
                                PRIMARY KEY (`AUTH_LOG_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_ADMIN_LOG
-- ----------------------------
CREATE TABLE `TBL_ADMIN_LOG` (
                                 `ADMIN_LOG_ID`	BIGINT	NOT NULL AUTO_INCREMENT COMMENT '관리자 로그 식별자',
                                 `ACTION`	ENUM('USER_SUSPEND', 'CLASS_DELETE')	NOT NULL	COMMENT '액션 코드(USER_SUSPEND, CLASS_DELETE)',
                                 `TARGET_TYPE`	ENUM('USER', 'CLASS', 'ENROLL')	NOT NULL	COMMENT '대상 타입(USER, CLASS, ENROLL)',
                                 `TARGET_ID`	BIGINT	NOT NULL	COMMENT '대상 식별자',
                                 `CREATE_DT`	DATETIME	NOT NULL,
                                 `USER_ID`	BIGINT	NOT NULL	COMMENT '사용자 일련번호',
                                 PRIMARY KEY (`ADMIN_LOG_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_ASSIGN
-- ----------------------------
CREATE TABLE `TBL_ASSIGN` (
                              `ASSIGN_ID`	BIGINT	NOT NULL,
                              `TASK_ID`	BIGINT	NOT NULL	COMMENT '과제/문항 식별자',
                              `CHARACTER_IMG`	VARCHAR(500)	NOT NULL,
                              `CHARACTER_PATH`	VARCHAR(1000)	NOT NULL,
                              `TITLE`	VARCHAR(255)	NOT NULL,
                              `SUB_TITLE`	VARCHAR(255)	NOT NULL,
                              `ASSIGN_CONTENT`	VARCHAR(1000)	NOT NULL,
                              PRIMARY KEY (`ASSIGN_ID`, `TASK_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_NOTIFICATION
-- ----------------------------
CREATE TABLE `TBL_NOTIFICATION` (
                                    `NOTIFICATION_ID`	BIGINT	NOT NULL AUTO_INCREMENT COMMENT '알림 식별자',
                                    `TYPE`	INT(10)	NOT NULL	COMMENT '알림 유형',
                                    `PAYLOAD_CONTENT`	VARCHAR(500)	NULL	COMMENT '알림 내용',
                                    `READ_DT`	DATETIME	NULL	COMMENT '읽은 시각',
                                    `CREATE_DT`	DATETIME	NULL,
                                    `USER_ID`	BIGINT	NOT NULL	COMMENT '사용자 일련번호',
                                    PRIMARY KEY (`NOTIFICATION_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_FEEDBACK
-- ----------------------------
CREATE TABLE `TBL_FEEDBACK` (
                                `FEEDBACK_ID`	VARCHAR(255)	NOT NULL,
                                `TASK_ID`	BIGINT	NOT NULL	COMMENT '과제/문항 식별자',
                                `FEEDBACK_TYPE`	ENUM('SUCCESS', 'FAILURE_LOGICAL', 'FAILURE_RUNTIME')	NOT NULL	COMMENT '피드백 타입(Success, Failure Logical, Failure Runtime)',
                                `CHARACTER_IMG`	VARCHAR(500)	NOT NULL,
                                `CHARACTER_PATH`	VARCHAR(1000)	NOT NULL,
                                `TITLE`	VARCHAR(255)	NOT NULL,
                                `SUB_TITLE`	VARCHAR(255)	NOT NULL,
                                `FEEDBACK_CONTENT`	VARCHAR(1000)	NOT NULL,
                                PRIMARY KEY (`FEEDBACK_ID`, `TASK_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_CODE_SNAPSHOT
-- ----------------------------
CREATE TABLE `TBL_CODE_SNAPSHOT` (
                                     `CODE_ID`	BIGINT	NOT NULL	COMMENT '코드 임시저장 식별 코드',
                                     `TASK_ID`	BIGINT	NOT NULL	COMMENT '과제/문항 식별자',
                                     `WEEKLY_SESSION_ID`	BIGINT	NOT NULL	COMMENT '주차 별 수업 인스턴스 식별 번호',
                                     `USER_ID`	BIGINT	NOT NULL	COMMENT '사용자 일련번호',
                                     `CYCLE_ID`	BIGINT	NOT NULL,
                                     `LANG`	ENUM('JAVA', 'PYTHON', 'JAVASCRIPT')	NOT NULL	COMMENT '언어(자바, 파이썬 등등)',
                                     `CONTENT`	MEDIUMTEXT	NOT NULL	COMMENT '코드 내용',
                                     `SAVE_AT`	DATETIME	NOT NULL	COMMENT '저장 시각',
                                     `CREATE_DT`	DATETIME	NOT NULL,
                                     `UPDATE_DT`	DATETIME	NULL,
                                     PRIMARY KEY (`CODE_ID`, `TASK_ID`, `WEEKLY_SESSION_ID`, `USER_ID`, `CYCLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_BRIEF
-- ----------------------------
CREATE TABLE `TBL_BRIEF` (
                             `BRIEF_ID`	VARCHAR(255)	NOT NULL,
                             `TASK_ID`	BIGINT	NOT NULL	COMMENT '과제/문항 식별자',
                             `CHARACTER_IMG`	VARCHAR(500)	NOT NULL	COMMENT '캐릭터 이름',
                             `CHARACTER_PATH`	VARCHAR(1000)	NOT NULL,
                             `TITLE`	VARCHAR(255)	NOT NULL,
                             `SUB_TITLE`	VARCHAR(255)	NOT NULL,
                             `BRIEF_CONTENT`	VARCHAR(1000)	NOT NULL,
                             PRIMARY KEY (`BRIEF_ID`, `TASK_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for TBL_ANSWER
-- ----------------------------
CREATE TABLE `TBL_ANSWER` (
                              `ANSWER_ID`	BIGINT	NOT NULL	COMMENT '답변 식별 코드',
                              `QUESTION_ID`	BIGINT	NOT NULL	COMMENT '질문 식별번호',
                              `CONTENT`	VARCHAR(500)	NOT NULL	COMMENT '답변 내용',
                              `CREATE_DT`	DATETIME	NOT NULL,
                              PRIMARY KEY (`ANSWER_ID`, `QUESTION_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------
-- Foreign Key Constraints
-- ----------------------------

ALTER TABLE `TBL_LECTURE_SECTION` ADD CONSTRAINT `FK_TBL_LECTURE_TO_TBL_LECTURE_SECTION_1` FOREIGN KEY (
                                                                                                        `LECTURE_ID`
    )
    REFERENCES `TBL_LECTURE` (
                              `LECTURE_ID`
        );

ALTER TABLE `TBL_QUESTION` ADD CONSTRAINT `FK_TBL_CLASS_TO_TBL_QUESTION_1` FOREIGN KEY (
                                                                                        `CLASS_ID`
    )
    REFERENCES `TBL_CLASS` (
                            `CLASS_ID`
        );

-- 수정된 복합 외래 키
ALTER TABLE `TBL_QUESTION` ADD CONSTRAINT `FK_TBL_WEEKLY_SESSION_TO_TBL_QUESTION_COMPOSITE` FOREIGN KEY (
                                                                                                         `WEEKLY_SESSION_ID`, `INVITE_ID`
    )
    REFERENCES `TBL_WEEKLY_SESSION` (
                                     `WEEKLY_SESSION_ID`, `INVITE_ID`
        );

-- 수정된 복합 외래 키
ALTER TABLE `TBL_CLASS_SUBMIT` ADD CONSTRAINT `FK_TBL_TASK_TO_TBL_CLASS_SUBMIT_COMPOSITE` FOREIGN KEY (
                                                                                                       `TASK_ID`, `CYCLE_ID`
    )
    REFERENCES `TBL_TASK` (
                           `TASK_ID`, `CYCLE_ID`
        );

ALTER TABLE `TBL_CLASS_SUBMIT` ADD CONSTRAINT `FK_TBL_CLASS_TO_TBL_CLASS_SUBMIT_1` FOREIGN KEY (
                                                                                                `CLASS_ID`
    )
    REFERENCES `TBL_CLASS` (
                            `CLASS_ID`
        );

ALTER TABLE `TBL_CLASS_SUBMIT` ADD CONSTRAINT `FK_TBL_WEEKLY_SESSION_TO_TBL_CLASS_SUBMIT_1` FOREIGN KEY (
                                                                                                         `WEEKLY_SESSION_ID`
    )
    REFERENCES `TBL_WEEKLY_SESSION` (
                                     `WEEKLY_SESSION_ID`
        );

-- 수정된 복합 외래 키
ALTER TABLE `TBL_MENTOR_DIALOG` ADD CONSTRAINT `FK_TBL_TASK_TO_TBL_MENTOR_DIALOG_COMPOSITE` FOREIGN KEY (
                                                                                                         `TASK_ID`, `CYCLE_ID`
    )
    REFERENCES `TBL_TASK` (
                           `TASK_ID`, `CYCLE_ID`
        );

ALTER TABLE `TBL_HINT` ADD CONSTRAINT `FK_TBL_TASK_TO_TBL_HINT_1` FOREIGN KEY (
                                                                               `TASK_ID`
    )
    REFERENCES `TBL_TASK` (
                           `TASK_ID`
        );

-- 수정된 복합 외래 키
ALTER TABLE `TBL_TEST_CASE` ADD CONSTRAINT `FK_TBL_TASK_TO_TBL_TEST_CASE_COMPOSITE` FOREIGN KEY (
                                                                                                 `TASK_ID`, `CYCLE_ID`
    )
    REFERENCES `TBL_TASK` (
                           `TASK_ID`, `CYCLE_ID`
        );

ALTER TABLE `TBL_WORK_LOG` ADD CONSTRAINT `FK_TBL_USER_TO_TBL_WORK_LOG_1` FOREIGN KEY (
                                                                                       `USER_ID`
    )
    REFERENCES `TBL_USER` (
                           `USER_ID`
        );

ALTER TABLE `TBL_TASK` ADD CONSTRAINT `FK_TBL_CYCLE_TO_TBL_TASK_1` FOREIGN KEY (
                                                                                `CYCLE_ID`
    )
    REFERENCES `TBL_CYCLE` (
                            `CYCLE_ID`
        );

ALTER TABLE `TBL_CURRICULUM_WEEK` ADD CONSTRAINT `FK_TBL_CURRICULUM_TO_TBL_CURRICULUM_WEEK_1` FOREIGN KEY (
                                                                                                           `CUR_ID`
    )
    REFERENCES `TBL_CURRICULUM` (
                                 `CUR_ID`
        );

ALTER TABLE `TBL_CYCLE` ADD CONSTRAINT `FK_TBL_CURRICULUM_WEEK_TO_TBL_CYCLE_1` FOREIGN KEY (
                                                                                            `CUR_WEEK_ID`
    )
    REFERENCES `TBL_CURRICULUM_WEEK` (
                                      `CUR_WEEK_ID`
        );

ALTER TABLE `TBL_CYCLE` ADD CONSTRAINT `FK_TBL_SYNTAX_TO_TBL_CYCLE_1` FOREIGN KEY (
                                                                                   `SYNTAX_ID`
    )
    REFERENCES `TBL_SYNTAX` (
                             `SYNTAX_ID`
        );

-- 수정된 복합 외래 키
ALTER TABLE `TBL_ACTIVITY_MONITOR` ADD CONSTRAINT `FK_TBL_WEEKLY_SESSION_TO_TBL_ACTIVITY_MONITOR_COMPOSITE` FOREIGN KEY (
                                                                                                                         `WEEKLY_SESSION_ID`, `INVITE_ID`
    )
    REFERENCES `TBL_WEEKLY_SESSION` (
                                     `WEEKLY_SESSION_ID`, `INVITE_ID`
        );

ALTER TABLE `TBL_PROGRESS` ADD CONSTRAINT `FK_TBL_CLASS_TO_TBL_PROGRESS_1` FOREIGN KEY (
                                                                                        `CLASS_ID`
    )
    REFERENCES `TBL_CLASS` (
                            `CLASS_ID`
        );

ALTER TABLE `TBL_PROGRESS` ADD CONSTRAINT `FK_TBL_WEEKLY_SESSION_TO_TBL_PROGRESS_1` FOREIGN KEY (
                                                                                                 `WEEKLY_SESSION_ID`
    )
    REFERENCES `TBL_WEEKLY_SESSION` (
                                     `WEEKLY_SESSION_ID`
        );

ALTER TABLE `TBL_EMAIL_VERIFICATION` ADD CONSTRAINT `FK_TBL_USER_TO_TBL_EMAIL_VERIFICATION_1` FOREIGN KEY (
                                                                                                           `USER_ID`
    )
    REFERENCES `TBL_USER` (
                           `USER_ID`
        );

ALTER TABLE `TBL_ASSIGN` ADD CONSTRAINT `FK_TBL_TASK_TO_TBL_ASSIGN_1` FOREIGN KEY (
                                                                                   `TASK_ID`
    )
    REFERENCES `TBL_TASK` (
                           `TASK_ID`
        );

ALTER TABLE `TBL_FEEDBACK` ADD CONSTRAINT `FK_TBL_TASK_TO_TBL_FEEDBACK_1` FOREIGN KEY (
                                                                                       `TASK_ID`
    )
    REFERENCES `TBL_TASK` (
                           `TASK_ID`
        );

ALTER TABLE `TBL_LECTURE` ADD CONSTRAINT `FK_TBL_TASK_TO_TBL_LECTURE_1` FOREIGN KEY (
                                                                                     `TASK_ID`
    )
    REFERENCES `TBL_TASK` (
                           `TASK_ID`
        );

-- 수정된 복합 외래 키
ALTER TABLE `TBL_CODE_SNAPSHOT` ADD CONSTRAINT `FK_TBL_TASK_TO_TBL_CODE_SNAPSHOT_COMPOSITE` FOREIGN KEY (
                                                                                                         `TASK_ID`, `CYCLE_ID`
    )
    REFERENCES `TBL_TASK` (
                           `TASK_ID`, `CYCLE_ID`
        );

ALTER TABLE `TBL_CODE_SNAPSHOT` ADD CONSTRAINT `FK_TBL_WEEKLY_SESSION_TO_TBL_CODE_SNAPSHOT_1` FOREIGN KEY (
                                                                                                           `WEEKLY_SESSION_ID`
    )
    REFERENCES `TBL_WEEKLY_SESSION` (
                                     `WEEKLY_SESSION_ID`
        );

ALTER TABLE `TBL_CODE_SNAPSHOT` ADD CONSTRAINT `FK_TBL_USER_TO_TBL_CODE_SNAPSHOT_1` FOREIGN KEY (
                                                                                                 `USER_ID`
    )
    REFERENCES `TBL_USER` (
                           `USER_ID`
        );

ALTER TABLE `TBL_WEEKLY_SESSION` ADD CONSTRAINT `FK_TBL_CLASS_INVITE_TO_TBL_WEEKLY_SESSION_1` FOREIGN KEY (
                                                                                                           `INVITE_ID`
    )
    REFERENCES `TBL_CLASS_INVITE` (
                                   `INVITE_ID`
        );

ALTER TABLE `TBL_BRIEF` ADD CONSTRAINT `FK_TBL_TASK_TO_TBL_BRIEF_1` FOREIGN KEY (
                                                                                 `TASK_ID`
    )
    REFERENCES `TBL_TASK` (
                           `TASK_ID`
        );

ALTER TABLE `TBL_ANSWER` ADD CONSTRAINT `FK_TBL_QUESTION_TO_TBL_ANSWER_1` FOREIGN KEY (
                                                                                       `QUESTION_ID`
    )
    REFERENCES `TBL_QUESTION` (
                               `QUESTION_ID`
        );

-- 누락되었던 FK 추가
ALTER TABLE `TBL_CLASS_ENROLL` ADD CONSTRAINT `FK_TBL_CLASS_TO_TBL_CLASS_ENROLL_1` FOREIGN KEY (
                                                                                                `CLASS_ID`
    )
    REFERENCES `TBL_CLASS` (
                            `CLASS_ID`
        );

ALTER TABLE `TBL_CLASS_ENROLL` ADD CONSTRAINT `FK_TBL_USER_TO_TBL_CLASS_ENROLL_1` FOREIGN KEY (
                                                                                               `USER_ID`
    )
    REFERENCES `TBL_USER` (
                           `USER_ID`
        );
