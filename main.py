import random
import string
import json
from collections import Counter
from flask import Flask, render_template, jsonify, request
import firebase_admin
from firebase_admin import credentials, firestore
from werkzeug.security import generate_password_hash, check_password_hash
import copy # deepcopy를 위해 import 추가

# Firebase 초기화 (앱이 없을 경우에만)
if not firebase_admin._apps:
    # 서비스 계정 키 파일 경로 설정 (환경 변수 또는 직접 경로 사용)
    # cred = credentials.Certificate('path/to/your/serviceAccountKey.json') # 로컬 실행 시
    # firebase_admin.initialize_app(cred)
    firebase_admin.initialize_app(options={
        'projectId': 'my-python-65210-65c44', # Cloud Run 등 환경에서는 자동 감지 가능
    })

db = firestore.client()
app = Flask(__name__, static_folder='static', template_folder='templates')

# --- HTML 페이지 라우팅 ---
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/monitor')
def monitor():
    return render_template('monitor.html')

@app.route('/report')
def report():
    return render_template('report.html')

@app.route('/growth')
def growth():
    return render_template('growth.html')

# --- API 엔드포인트 ---

# 시나리오 데이터 가져오기 (사용자 레벨별 콘텐츠 분기 포함)
@app.route('/api/scenario/week/<int:week_num>')
def get_scenario(week_num):
    try:
        user_email = request.args.get('userEmail')
        if not user_email:
            return jsonify({"status": "error", "message": "사용자 이메일 정보가 필요합니다."}), 400

        user_doc_ref = db.collection('users').document(user_email)
        user_doc = user_doc_ref.get()
        if not user_doc.exists:
            return jsonify({"status": "error", "message": "사용자 정보를 찾을 수 없습니다."}), 404
        user_data = user_doc.to_dict()
        user_level = user_data.get('user_level', 'beginner')

        doc_id = f'week_{week_num}'
        scenario_doc = db.collection('scenarios').document(doc_id).get()
        if not scenario_doc.exists:
            if week_num > 1:
                 return jsonify({"status": "error", "message": "해당 주차의 시나리오를 찾을 수 없습니다."}), 404
            else:
                 return jsonify({"status": "error", "message": f"{week_num}주차 시나리오 문서를 찾을 수 없습니다."}), 404

        scenario_data = scenario_doc.to_dict()
        processed_cycles = []
        original_cycles = scenario_data.get('cycles', [])

        for cycle_data in original_cycles:
            processed_cycle = copy.deepcopy(cycle_data)

            if user_level == 'advanced' and 'starterCode_adv' in processed_cycle:
                selected_starterCode = processed_cycle['starterCode_adv']
            else:
                selected_starterCode = processed_cycle.get('starterCode', '')

            if user_level == 'advanced' and 'task_adv' in processed_cycle:
                selected_task = processed_cycle['task_adv']
            else:
                selected_task = processed_cycle.get('task', {})

            if user_level == 'advanced' and 'briefing_adv' in processed_cycle:
                selected_briefing = processed_cycle['briefing_adv']
            else:
                selected_briefing = processed_cycle.get('briefing', {})

            processed_cycle['starterCode'] = selected_starterCode
            processed_cycle['task'] = selected_task
            processed_cycle['briefing'] = selected_briefing

            processed_cycle.pop('starterCode_adv', None)
            processed_cycle.pop('task_adv', None)
            processed_cycle.pop('briefing_adv', None)

            processed_cycles.append(processed_cycle)

        scenario_data['cycles'] = processed_cycles
        return jsonify(scenario_data)

    except Exception as e:
        print(f"Error in get_scenario (week {week_num}, user {user_email}): {e}")
        return jsonify({"status": "error", "message": f"서버 오류 발생: {e}"}), 500

# 회원가입
@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'student')
        user_level = data.get('user_level', 'beginner') # 기본값 beginner

        if not all([name, email, password]):
            return jsonify({"status": "error", "message": "이름, 이메일, 비밀번호는 필수입니다."}), 400

        users_ref = db.collection('users')
        user_doc = users_ref.document(email).get()
        if user_doc.exists:
            return jsonify({"status": "error", "message": "이미 가입된 이메일입니다."}), 409
        else:
            password_hash = generate_password_hash(password)
            users_ref.document(email).set({
                'name': name,
                'email': email,
                'passwordHash': password_hash,
                'role': role,
                'user_level': user_level,
                'progress': {'week': 1, 'cycle': 0},
                'lastSeenIntroWeek': 0,
                'seenCodingIntros': []
            })
            return jsonify({"status": "success", "message": "회원가입이 완료되었습니다."}), 201
    except Exception as e:
        print(f"Error in signup: {e}")
        return jsonify({"status": "error", "message": f"서버 오류: {e}"}), 500

# 로그인
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
             return jsonify({"status": "error", "message": "이메일과 비밀번호를 입력해주세요."}), 400

        user_ref = db.collection('users').document(email)
        user_doc = user_ref.get()

        if not user_doc.exists:
            return jsonify({"status": "error", "message": "이메일 또는 비밀번호가 올바르지 않습니다."}), 401

        user_data = user_doc.to_dict()

        # 로그인 성공 시 사용자 정보 가공 함수
        def process_login_success(user_data, user_ref):
            # 주간 인트로 표시 여부 확인 및 업데이트
            show_intro = False
            current_week = user_data.get('progress', {}).get('week', 1)
            last_seen_week = user_data.get('lastSeenIntroWeek', 0)
            if current_week > last_seen_week:
                show_intro = True
                user_ref.update({'lastSeenIntroWeek': current_week})
                user_data['lastSeenIntroWeek'] = current_week # 응답에도 반영
            user_data['showWeeklyIntro'] = show_intro

            # 필수 필드 기본값 설정
            if 'seenCodingIntros' not in user_data: user_data['seenCodingIntros'] = []
            if 'user_level' not in user_data: user_data['user_level'] = 'beginner'
            if 'progress' not in user_data: user_data['progress'] = {'week': 1, 'cycle': 0}

            # 응답에서 비밀번호 관련 필드 제거
            user_data.pop('passwordHash', None)
            user_data.pop('password', None)
            return user_data

        # 비밀번호 해시 검증
        if 'passwordHash' in user_data and check_password_hash(user_data['passwordHash'], password):
            processed_user_data = process_login_success(user_data, user_ref)
            return jsonify({"status": "success", "message": "로그인 성공!", "user": processed_user_data})
        # 레거시 비밀번호 검증 (점진적 해시 업데이트 고려)
        elif 'password' in user_data and user_data['password'] == password:
            # 보안 강화: 레거시 비밀번호 성공 시 해시로 업데이트
            try:
                password_hash = generate_password_hash(password)
                user_ref.update({'passwordHash': password_hash, 'password': firestore.DELETE_FIELD})
                print(f"Updated legacy password to hash for user: {email}")
            except Exception as update_err:
                print(f"Failed to update legacy password hash for {email}: {update_err}")

            processed_user_data = process_login_success(user_data, user_ref)
            return jsonify({"status": "success", "message": "로그인 성공! (레거시 인증)", "user": processed_user_data})
        else:
            return jsonify({"status": "error", "message": "이메일 또는 비밀번호가 올바르지 않습니다."}), 401
    except Exception as e:
        print(f"Error in login: {e}")
        return jsonify({"status": "error", "message": f"서버 오류: {e}"}), 500

# --- 👇👇👇 사용자 레벨 업데이트 API 추가 👇👇👇 ---
@app.route('/api/user/level/update', methods=['POST'])
def update_user_level():
    try:
        data = request.get_json()
        email = data.get('email')
        user_level = data.get('user_level')

        # 입력값 검증
        if not email:
            return jsonify({"status": "error", "message": "사용자 이메일 정보가 필요합니다."}), 400
        if user_level not in ['beginner', 'advanced']:
            return jsonify({"status": "error", "message": "유효하지 않은 레벨 값입니다 ('beginner' 또는 'advanced')."}), 400

        user_ref = db.collection('users').document(email)
        user_doc = user_ref.get()

        if not user_doc.exists:
            return jsonify({"status": "error", "message": "사용자 정보를 찾을 수 없습니다."}), 404

        # Firestore 업데이트
        user_ref.update({'user_level': user_level})

        return jsonify({"status": "success", "message": "학습 레벨이 업데이트되었습니다."})

    except Exception as e:
        print(f"Error in update_user_level: {e}")
        return jsonify({"status": "error", "message": f"레벨 업데이트 중 서버 오류 발생: {e}"}), 500
# --- 👆👆👆 사용자 레벨 업데이트 API 추가 완료 👆👆👆 ---

# 진행 상황 업데이트
@app.route('/api/progress/update', methods=['POST'])
def update_progress():
    try:
        data = request.get_json()
        email = data.get('email')
        progress = data.get('progress')
        if not email or progress is None: # progress가 0일 수도 있으므로 None 체크
            return jsonify({"status": "error", "message": "필요한 정보(email, progress)가 누락되었습니다."}), 400
        # progress 데이터 형식 검증 (선택적이지만 권장)
        if not isinstance(progress, dict) or 'week' not in progress or 'cycle' not in progress:
             return jsonify({"status": "error", "message": "올바른 progress 형식이 아닙니다 (예: {'week': 1, 'cycle': 0})."}), 400

        db.collection('users').document(email).update({'progress': progress})
        return jsonify({"status": "success", "message": "진행 상황이 저장되었습니다."})
    except Exception as e:
        print(f"Error in update_progress: {e}")
        return jsonify({"status": "error", "message": f"서버 오류: {e}"}), 500

# 실시간 코드 업데이트
@app.route('/api/livecode/update', methods=['POST'])
def update_live_code():
    try:
        data = request.get_json()
        email = data.get('email')
        live_code = data.get('liveCode', '') # 코드가 없을 경우 빈 문자열
        if not email:
            return jsonify({"status": "error", "message": "사용자 이메일 정보가 없습니다."}), 400

        db.collection('users').document(email).set({
            'liveCode': live_code,
            'lastActive': firestore.SERVER_TIMESTAMP
        }, merge=True)

        return jsonify({"status": "success"})
    except Exception as e:
        # 실시간 코드는 매우 빈번하게 호출될 수 있으므로 오류 로깅 최소화
        # print(f"Error in update_live_code: {e}")
        return jsonify({"status": "error", "message": f"코드 업데이트 중 오류 발생: {e}"}), 500

# 일시정지 상태 설정
@app.route('/api/pause/set', methods=['POST'])
def set_pause_state():
    try:
        data = request.get_json()
        email = data.get('email')
        pause_state = data.get('pauseState')
        if not email or pause_state is None:
            return jsonify({"status": "error", "message": "필수 정보(email, pauseState)가 누락되었습니다."}), 400
        # pauseState 형식 검증 (선택적)
        if not isinstance(pause_state, dict) or 'view' not in pause_state or 'code' not in pause_state:
             return jsonify({"status": "error", "message": "올바른 pauseState 형식이 아닙니다 (예: {'view': 'dashboard', 'code': '...'})."}), 400

        db.collection('users').document(email).update({'pauseState': pause_state})
        return jsonify({"status": "success", "message": "일시정지 상태가 저장되었습니다."})
    except Exception as e:
        print(f"Error in set_pause_state: {e}")
        return jsonify({"status": "error", "message": f"상태 저장 중 오류 발생: {e}"}), 500

# 일시정지 상태 해제
@app.route('/api/pause/clear', methods=['POST'])
def clear_pause_state():
    try:
        data = request.get_json()
        email = data.get('email')
        if not email:
            return jsonify({"status": "error", "message": "이메일 정보가 없습니다."}), 400

        db.collection('users').document(email).update({'pauseState': firestore.DELETE_FIELD})
        return jsonify({"status": "success", "message": "일시정지 상태가 해제되었습니다."})
    except Exception as e:
        print(f"Error in clear_pause_state: {e}")
        return jsonify({"status": "error", "message": f"상태 해제 중 오류 발생: {e}"}), 500

# 초대 코드 생성 함수
def generate_invite_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

# 수업 목록 가져오기
@app.route('/api/classes', methods=['GET'])
def get_classes():
    instructor_email = request.args.get('email')
    if not instructor_email:
        return jsonify({"status": "error", "message": "교수자 이메일 정보가 필요합니다."}), 400
    try:
        classes_ref = db.collection('classes').where('instructorEmail', '==', instructor_email).order_by('createdAt', direction=firestore.Query.DESCENDING).stream()
        classes = []
        for doc in classes_ref:
             class_data = doc.to_dict()
             # Firestore 타임스탬프 -> ISO 문자열 변환
             if 'createdAt' in class_data and hasattr(class_data['createdAt'], 'isoformat'):
                 class_data['createdAt'] = class_data['createdAt'].isoformat()
             classes.append(class_data)
        return jsonify({"status": "success", "classes": classes})
    except Exception as e:
        print(f"Error in get_classes: {e}")
        return jsonify({"status": "error", "message": f"수업 목록을 불러오는 중 오류 발생: {e}"}), 500

# 수업 생성
@app.route('/api/classes/create', methods=['POST'])
def create_class():
    try:
        data = request.get_json()
        class_details = data.get('classDetails')
        instructor_email = data.get('instructorEmail')

        if not class_details or not instructor_email:
            return jsonify({"status": "error", "message": "수업 상세 정보와 교수자 정보가 필요합니다."}), 400

        # 수업 이름 조합
        subject = class_details.get('subject', '제목 없음')
        year = class_details.get('year', '----')
        semester = class_details.get('semester', '-')
        department = class_details.get('department', '')
        section = class_details.get('section', '--')
        class_name = f"[{year} {semester}] {subject} ({department} {section}분반)"

        invite_code = generate_invite_code()
        new_class_ref = db.collection('classes').document() # ID 자동 생성
        class_id = new_class_ref.id

        new_class_data = {
            'classId': class_id, 'className': class_name, 'details': class_details,
            'instructorEmail': instructor_email, 'inviteCode': invite_code,
            'students': [], 'createdAt': firestore.SERVER_TIMESTAMP
        }
        new_class_ref.set(new_class_data)

        # 응답 데이터 가공 (타임스탬프 제거)
        response_data = new_class_data.copy()
        response_data.pop('createdAt', None)

        return jsonify({"status": "success", "message": "새로운 수업이 개설되었습니다.", "class": response_data}), 201
    except Exception as e:
        print(f"Error in create_class: {e}")
        return jsonify({"status": "error", "message": f"수업 개설 중 오류 발생: {e}"}), 500

# 수업 삭제
@app.route('/api/classes/delete', methods=['POST'])
def delete_class():
    try:
        data = request.get_json()
        class_id = data.get('classId')
        instructor_email = data.get('instructorEmail')

        if not class_id or not instructor_email:
            return jsonify({"status": "error", "message": "수업 ID와 교수자 정보가 필요합니다."}), 400

        class_ref = db.collection('classes').document(class_id)
        class_doc = class_ref.get()

        if not class_doc.exists:
            return jsonify({"status": "error", "message": "존재하지 않는 수업입니다."}), 404
        class_data = class_doc.to_dict()
        if class_data.get('instructorEmail') != instructor_email:
            return jsonify({"status": "error", "message": "수업을 삭제할 권한이 없습니다."}), 403

        # Batch write 사용: 학생 업데이트 + 수업 삭제
        batch = db.batch()
        student_emails = class_data.get('students', [])
        for email in student_emails:
            student_ref = db.collection('users').document(email)
            # 학생 문서가 존재하는지 확인 후 업데이트 (선택적)
            # student_snap = student_ref.get()
            # if student_snap.exists:
            batch.update(student_ref, {'classId': firestore.DELETE_FIELD})
        batch.delete(class_ref) # 수업 문서 삭제
        batch.commit()

        return jsonify({"status": "success", "message": "수업이 성공적으로 삭제되었습니다."})
    except Exception as e:
        print(f"Error in delete_class: {e}")
        return jsonify({"status": "error", "message": f"수업 삭제 중 오류 발생: {e}"}), 500

# 수업 참여
@app.route('/api/classes/join', methods=['POST'])
def join_class():
    try:
        data = request.get_json()
        invite_code = data.get('inviteCode')
        student_email = data.get('studentEmail')
        if not invite_code or not student_email:
            return jsonify({"status": "error", "message": "초대 코드와 학생 정보가 필요합니다."}), 400

        # 초대 코드로 수업 찾기
        classes_ref = db.collection('classes').where('inviteCode', '==', invite_code).limit(1).stream()
        target_class_doc = next(classes_ref, None) # 첫 번째 결과 가져오기
        if not target_class_doc:
            return jsonify({"status": "error", "message": "유효하지 않은 초대 코드입니다."}), 404

        class_id = target_class_doc.id
        class_data = target_class_doc.to_dict()

        # 학생 정보 확인 (이미 다른 수업 참여 중인지)
        student_doc_ref = db.collection('users').document(student_email)
        student_doc = student_doc_ref.get()
        if student_doc.exists and student_doc.to_dict().get('classId'):
             # 이미 참여 중인 수업 ID 확인 (선택적)
             # existing_class_id = student_doc.to_dict().get('classId')
             # if existing_class_id == class_id:
             #     return jsonify({"status": "info", "message": "이미 해당 수업에 참여하고 있습니다."}), 200
             return jsonify({"status": "error", "message": "이미 다른 수업에 참여중입니다. 참여중인 수업을 탈퇴 후 시도해주세요."}), 400
        elif not student_doc.exists:
             # 가입되지 않은 사용자인 경우 (선택적 처리)
             return jsonify({"status": "error", "message": "가입되지 않은 사용자입니다. 회원가입을 먼저 진행해주세요."}), 404


        # Firestore 업데이트 (수업 문서에 학생 추가, 학생 문서에 수업 ID 추가)
        db.collection('classes').document(class_id).update({'students': firestore.ArrayUnion([student_email])})
        student_doc_ref.set({'classId': class_id}, merge=True)

        return jsonify({"status": "success", "message": f"'{class_data['className']}' 수업에 참여했습니다!", "classId": class_id, "className": class_data['className']})
    except Exception as e:
        print(f"Error in join_class: {e}")
        return jsonify({"status": "error", "message": f"수업 참여 중 오류 발생: {e}"}), 500

# 수업 상세 정보 가져오기
@app.route('/api/class/<class_id>', methods=['GET'])
def get_class_details(class_id):
    try:
        class_doc = db.collection('classes').document(class_id).get()
        if not class_doc.exists:
            return jsonify({"status": "error", "message": "존재하지 않는 수업입니다."}), 404
        class_info = class_doc.to_dict()

        # 학생 상세 정보 조회
        student_emails = class_info.get('students', [])
        student_details = []
        if student_emails:
            users_ref = db.collection('users')
            # Firestore 'in' 쿼리 사용 (최대 10개 email) - 학생 수가 많으면 페이지네이션 필요
            # chunks = [student_emails[i:i + 10] for i in range(0, len(student_emails), 10)]
            # for chunk in chunks:
            #      student_docs = users_ref.where('email', 'in', chunk).stream()
            #      ... (처리 로직)
            # 여기서는 개별 조회 방식 유지
            for email in student_emails:
                student_doc = users_ref.document(email).get()
                if student_doc.exists:
                    student_data = student_doc.to_dict()
                    student_data.pop('passwordHash', None)
                    student_data.pop('password', None)
                    if 'lastActive' in student_data and hasattr(student_data['lastActive'], 'isoformat'):
                        student_data['lastActive'] = student_data['lastActive'].isoformat()
                    student_details.append(student_data)

        # 타임스탬프 변환
        if 'createdAt' in class_info and hasattr(class_info['createdAt'], 'isoformat'):
             class_info['createdAt'] = class_info['createdAt'].isoformat()

        return jsonify({"status": "success", "classInfo": class_info, "students": student_details})
    except Exception as e:
        print(f"Error in get_class_details: {e}")
        return jsonify({"status": "error", "message": f"수업 상세 정보를 불러오는 중 오류 발생: {e}"}), 500

# 질문 등록
@app.route('/api/question/ask', methods=['POST'])
def ask_question():
    try:
        data = request.get_json()
        student_email = data.get('email')
        question_text = data.get('question')
        progress = data.get('progress')
        class_id = data.get('classId')
        character_context = data.get('characterContext')

        if not all([student_email, question_text, progress, class_id, character_context]):
            return jsonify({"status": "error", "message": "필수 정보가 누락되었습니다."}), 400

        question_ref = db.collection('questions').document()
        question_ref.set({
            'questionId': question_ref.id, 'classId': class_id, 'studentEmail': student_email,
            'question': question_text, 'progress': progress, 'characterContext': character_context,
            'isResolved': False, 'isNotified': False, 'answer': '',
            'createdAt': firestore.SERVER_TIMESTAMP
        })
        return jsonify({"status": "success", "message": "질문이 성공적으로 등록되었습니다."}), 201
    except Exception as e:
        print(f"Error in ask_question: {e}")
        return jsonify({"status": "error", "message": f"질문 등록 중 오류 발생: {e}"}), 500

# 답변 등록
@app.route('/api/question/answer', methods=['POST'])
def answer_question():
    try:
        data = request.get_json()
        question_id = data.get('questionId')
        answer_text = data.get('answer')

        if not question_id or not answer_text:
            return jsonify({"status": "error", "message": "질문 ID와 답변 내용이 필요합니다."}), 400

        question_ref = db.collection('questions').document(question_id)
        # 답변 등록 시 isNotified 는 false 로 유지해야 프론트엔드 리스너가 감지
        question_ref.update({
            'answer': answer_text,
            'isResolved': True,
            'isNotified': False
        })
        return jsonify({"status": "success", "message": "답변이 등록되었습니다."})
    except Exception as e:
        print(f"Error in answer_question: {e}")
        return jsonify({"status": "error", "message": f"답변 등록 중 오류 발생: {e}"}), 500

# 내 질문 목록 가져오기
@app.route('/api/questions/my', methods=['GET'])
def get_my_questions():
    student_email = request.args.get('email')
    if not student_email:
        return jsonify({"status": "error", "message": "학생 이메일 정보가 필요합니다."}), 400
    try:
        # 정렬: 답변 완료 여부(false 먼저), 생성 시간(최신 먼저)
        questions_ref = db.collection('questions') \
            .where('studentEmail', '==', student_email) \
            .order_by('isResolved') \
            .order_by('createdAt', direction=firestore.Query.DESCENDING) \
            .stream()
        questions = []
        for doc in questions_ref:
            q_data = doc.to_dict()
            if 'createdAt' in q_data and hasattr(q_data['createdAt'], 'isoformat'):
                q_data['createdAt'] = q_data['createdAt'].isoformat()
            questions.append(q_data)
        return jsonify({"status": "success", "questions": questions})
    except Exception as e:
        print(f"Error in get_my_questions: {e}")
        return jsonify({"status": "error", "message": f"질문 목록을 불러오는 중 오류 발생: {e}"}), 500

# 제출 로그 기록
@app.route('/api/log/submission', methods=['POST'])
def log_submission():
    try:
        data = request.get_json()
        required_fields = ['email', 'classId', 'week', 'cycle', 'isSuccess']
        if not all(field in data for field in required_fields):
            return jsonify({"status": "error", "message": "필수 로그 정보가 누락되었습니다."}), 400

        log_ref = db.collection('submission_logs').document()
        log_ref.set({
            'logId': log_ref.id,
            'studentEmail': data.get('email'), 'classId': data.get('classId'),
            'week': data.get('week'), 'cycle': data.get('cycle'),
            'isSuccess': data.get('isSuccess'), 'error': data.get('error', ''),
            'submittedAt': firestore.SERVER_TIMESTAMP
        })
        return jsonify({"status": "success", "message": "제출 기록이 저장되었습니다."}), 201
    except Exception as e:
        # 로그 기록 실패는 사용자에게 알리지 않을 수 있음
        print(f"Error in log_submission: {e}")
        return jsonify({"status": "error", "message": f"로그 저장 중 오류 발생: {e}"}), 500

# 업무일지(회고) 기록
@app.route('/api/log/reflection', methods=['POST'])
def log_reflection():
    try:
        data = request.get_json()
        required_fields = ['email', 'classId', 'week', 'ratings', 'feedback']
        if not all(field in data for field in required_fields):
            return jsonify({"status": "error", "message": "필수 회고 정보가 누락되었습니다."}), 400

        log_ref = db.collection('reflections').document()
        log_ref.set({
            'reflectionId': log_ref.id,
            'studentEmail': data.get('email'), 'classId': data.get('classId'),
            'week': data.get('week'), 'ratings': data.get('ratings'),
            'feedback': data.get('feedback'),
            'submittedAt': firestore.SERVER_TIMESTAMP
        })
        return jsonify({"status": "success", "message": "업무일지가 저장되었습니다."}), 201
    except Exception as e:
        print(f"Error in log_reflection: {e}")
        return jsonify({"status": "error", "message": f"업무일지 저장 중 오류 발생: {e}"}), 500

# --- 분석 API ---

# 클래스 분석 데이터 가져오기
@app.route('/api/analytics/class/<class_id>', methods=['GET'])
def get_class_analytics(class_id):
    try:
        class_doc = db.collection('classes').document(class_id).get()
        if not class_doc.exists:
            return jsonify({"status": "error", "message": "클래스를 찾을 수 없습니다."}), 404
        class_info = class_doc.to_dict()

        # 1. 제출 로그 분석
        logs_ref = db.collection('submission_logs').where('classId', '==', class_id).stream()
        logs = [log.to_dict() for log in logs_ref]
        total_submissions = len(logs)
        success_submissions = sum(1 for log in logs if log['isSuccess'])
        success_rate = round((success_submissions / total_submissions * 100), 2) if total_submissions > 0 else 0

        # 주차별 성공률
        weekly_stats = {}
        for log in logs:
            week = log.get('week')
            if week is None: continue # week 정보 없는 로그는 제외
            if week not in weekly_stats: weekly_stats[week] = {'success': 0, 'total': 0}
            weekly_stats[week]['total'] += 1
            if log['isSuccess']: weekly_stats[week]['success'] += 1
        weekly_success_rate = {f"{w}주차": round((d['success']/d['total']*100), 2) for w, d in weekly_stats.items() if d['total'] > 0}

        # 가장 많이 실패한 과제 (사이클 제목 포함)
        failed_logs = [log for log in logs if not log['isSuccess'] and log.get('week') is not None and log.get('cycle') is not None]
        scenario_titles = {} # 주차별 사이클 제목 캐시
        for w in set(log['week'] for log in failed_logs):
             scenario_doc = db.collection('scenarios').document(f'week_{w}').get()
             if scenario_doc.exists:
                 cycles = scenario_doc.to_dict().get('cycles', [])
                 scenario_titles[w] = {idx: cyc.get('title', f'사이클 {idx+1}') for idx, cyc in enumerate(cycles)}
        # 실패 로그 제목 생성 로직 수정 (중첩 f-string 분리)
        failed_cycle_titles = []
        for log in failed_logs:
            week_num = log.get('week')
            cycle_num = log.get('cycle')
            if week_num is not None and cycle_num is not None:
                # 사이클 제목 가져오기 (없으면 기본값 생성)
                cycle_title_or_default = scenario_titles.get(week_num, {}).get(cycle_num, f'사이클 {cycle_num + 1}')
                failed_cycle_titles.append(f"{week_num}주차: {cycle_title_or_default}")

        failure_counter = Counter(failed_cycle_titles) # 분리된 리스트로 Counter 생성
        # 약 645번째 줄 근처 (기존 라인 위치가 조금 밀릴 수 있음)
        most_failed_cycles = failure_counter.most_common(5)

        # 2. 학생 진도 현황
        student_emails = class_info.get('students', [])
        student_progress = []
        if student_emails:
            users_ref = db.collection('users')
            # 학생 정보 일괄 조회 (In 쿼리 - 최대 10명 제한 주의)
            # chunks = [student_emails[i:i + 10] for i in range(0, len(student_emails), 10)]
            # for chunk in chunks:
            #     student_docs = users_ref.where('email', 'in', chunk).stream() ...
            # 개별 조회 유지
            for email in student_emails:
                student_doc = users_ref.document(email).get()
                if student_doc.exists:
                    s_data = student_doc.to_dict()
                    progress = s_data.get('progress', {'week': 1, 'cycle': 0}) # 기본값 설정
                    student_progress.append({
                        'name': s_data.get('name', '이름없음'), 'email': s_data.get('email'),
                        'week': progress.get('week', 1), 'cycle': progress.get('cycle', 0) + 1 # cycle은 1부터 시작
                    })

        # 3. 업무일지(회고) 분석
        reflections_ref = db.collection('reflections').where('classId', '==', class_id).stream()
        reflections = [r.to_dict() for r in reflections_ref]
        reflection_analysis = {}
        for reflection in reflections:
            week = reflection.get('week')
            if week is None: continue
            if week not in reflection_analysis:
                reflection_analysis[week] = {
                    'topics': {}, 'feedback_summary': {'meaningful': [], 'difficult': [], 'curious': []},
                    'participant_count': set()
                }
            reflection_analysis[week]['participant_count'].add(reflection['studentEmail'])

            # 자기 평가 점수 집계
            for rating in reflection.get('ratings', []):
                topic = rating.get('topic')
                comp = rating.get('comprehension')
                app = rating.get('application')
                if not topic: continue
                if topic not in reflection_analysis[week]['topics']:
                    reflection_analysis[week]['topics'][topic] = {'comprehension': [], 'application': []}
                if isinstance(comp, (int, float)): reflection_analysis[week]['topics'][topic]['comprehension'].append(comp)
                if isinstance(app, (int, float)): reflection_analysis[week]['topics'][topic]['application'].append(app)

            # 텍스트 피드백 수집
            feedback = reflection.get('feedback', {})
            if feedback.get('meaningful'): reflection_analysis[week]['feedback_summary']['meaningful'].append(feedback['meaningful'])
            if feedback.get('difficult'): reflection_analysis[week]['feedback_summary']['difficult'].append(feedback['difficult'])
            if feedback.get('curious'): reflection_analysis[week]['feedback_summary']['curious'].append(feedback['curious'])

        # 평균 계산 및 최종 데이터 구조화
        for week, data in reflection_analysis.items():
            for topic, ratings in data['topics'].items():
                comp_avg = sum(ratings['comprehension']) / len(ratings['comprehension']) if ratings['comprehension'] else 0
                app_avg = sum(ratings['application']) / len(ratings['application']) if ratings['application'] else 0
                reflection_analysis[week]['topics'][topic] = {'comprehension_avg': round(comp_avg, 2), 'application_avg': round(app_avg, 2)}
            reflection_analysis[week]['participant_count'] = len(data['participant_count'])

        return jsonify({
            "status": "success", "className": class_info.get('className'),
            "totalSubmissions": total_submissions, "successRate": success_rate,
            "weeklySuccessRate": weekly_success_rate, "mostFailedCycles": most_failed_cycles,
            "studentProgress": sorted(student_progress, key=lambda x: (-x['week'], -x['cycle'])), # 진도 높은 순 정렬
            "reflectionAnalysis": reflection_analysis
        })

    except Exception as e:
        print(f"Error in get_class_analytics: {e}")
        return jsonify({"status": "error", "message": f"분석 데이터 로드 중 오류 발생: {e}"}), 500

# 나의 성장 기록 데이터 가져오기
@app.route('/api/analytics/my-growth', methods=['GET'])
def get_my_growth_data():
    student_email = request.args.get('email')
    if not student_email:
        return jsonify({"status": "error", "message": "학생 이메일 정보가 필요합니다."}), 400
    try:
        reflections_ref = db.collection('reflections').where('studentEmail', '==', student_email).order_by('week').stream()
        growth_data = []
        scenario_docs = {doc.id: doc.to_dict() for doc in db.collection('scenarios').stream()} # 시나리오 미리 로드

        for doc in reflections_ref:
            reflection = doc.to_dict()
            week = reflection.get('week')
            if week is None: continue

            # 주차/사이클 제목 추가
            week_key = f"week_{week}"
            if week_key in scenario_docs:
                week_data = scenario_docs[week_key]
                reflection['weekTitle'] = week_data.get('title', f'{week}주차')
                reflection['cycleTitles'] = [cyc.get('title', f'사이클 {i+1}') for i, cyc in enumerate(week_data.get('cycles', []))]

            # 타임스탬프 변환
            if 'submittedAt' in reflection and hasattr(reflection['submittedAt'], 'isoformat'):
                reflection['submittedAt'] = reflection['submittedAt'].isoformat()
            growth_data.append(reflection)

        return jsonify({"status": "success", "data": growth_data})
    except Exception as e:
        print(f"Error in get_my_growth_data: {e}")
        return jsonify({"status": "error", "message": f"성장 기록을 불러오는 중 오류 발생: {e}"}), 500

# 코딩 인트로 확인 기록
@app.route('/api/coding-intro/seen', methods=['POST'])
def mark_coding_intro_seen():
    try:
        data = request.get_json()
        email = data.get('email')
        intro_key = data.get('introKey') # 예: 'week1_cycle0'

        if not email or not intro_key:
            return jsonify({"status": "error", "message": "필수 정보(email, introKey)가 누락되었습니다."}), 400

        user_ref = db.collection('users').document(email)
        # ArrayUnion: 중복 없이 배열 필드에 요소 추가
        user_ref.update({'seenCodingIntros': firestore.ArrayUnion([intro_key])})

        return jsonify({"status": "success", "message": "확인되었습니다."})
    except Exception as e:
        print(f"Error in mark_coding_intro_seen: {e}")
        return jsonify({"status": "error", "message": f"오류 발생: {e}"}), 500

# --- 앱 실행 ---
if __name__ == '__main__':
    # Cloud Run 환경에서는 Gunicorn이 사용되므로, 이 부분은 로컬 개발 시에만 실행됨
    app.run(host='0.0.0.0', port=8080, debug=True) # debug=True는 개발 시에만 사용