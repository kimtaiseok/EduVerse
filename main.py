import random
import string
import json
from collections import Counter
from flask import Flask, render_template, jsonify, request
import firebase_admin
from firebase_admin import credentials, firestore
from werkzeug.security import generate_password_hash, check_password_hash
import copy # deepcopy를 위해 import 추가
import subprocess # ★★★ 코드 실행을 위해 추가 ★★★
import tempfile # ★★★ 임시 파일 생성을 위해 추가 ★★★
import os # ★★★ 파일 경로 처리를 위해 추가 ★★★

# Firebase 초기화 (앱이 없을 경우에만)
if not firebase_admin._apps:
    firebase_admin.initialize_app(options={
        'projectId': 'my-python-65210-65c44',
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

# 시나리오 데이터 가져오기 (수정 없음 - 이미 레벨별 콘텐츠 분기 구현됨)
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
            processed_cycle = copy.deepcopy(cycle_data) # Use deepcopy to avoid modifying original

            # Select appropriate content based on user level and availability of '_adv' fields
            selected_starterCode = processed_cycle.get('starterCode', '')
            if user_level == 'advanced' and 'starterCode_adv' in processed_cycle:
                selected_starterCode = processed_cycle['starterCode_adv']

            selected_task = processed_cycle.get('task', {})
            if user_level == 'advanced' and 'task_adv' in processed_cycle:
                selected_task = processed_cycle['task_adv']

            selected_briefing = processed_cycle.get('briefing', {})
            if user_level == 'advanced' and 'briefing_adv' in processed_cycle:
                selected_briefing = processed_cycle['briefing_adv']

            # Overwrite the base keys with selected content
            processed_cycle['starterCode'] = selected_starterCode
            processed_cycle['task'] = selected_task
            processed_cycle['briefing'] = selected_briefing

            # Remove '_adv' keys from the final cycle data sent to frontend
            processed_cycle.pop('starterCode_adv', None)
            processed_cycle.pop('task_adv', None)
            processed_cycle.pop('briefing_adv', None)
            # ★★★ testCode_adv는 프론트엔드로 보내지 않으므로 여기서 제거 ★★★
            processed_cycle.pop('testCode_adv', None)

            processed_cycles.append(processed_cycle)

        scenario_data['cycles'] = processed_cycles
        return jsonify(scenario_data)

    except Exception as e:
        print(f"Error in get_scenario (week {week_num}, user {user_email}): {e}")
        return jsonify({"status": "error", "message": f"서버 오류 발생: {e}"}), 500

# 회원가입 (수정 없음)
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

# 로그인 (수정 없음)
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
            show_intro = False
            current_week = user_data.get('progress', {}).get('week', 1)
            last_seen_week = user_data.get('lastSeenIntroWeek', 0)
            if current_week > last_seen_week:
                show_intro = True
                user_ref.update({'lastSeenIntroWeek': current_week})
                user_data['lastSeenIntroWeek'] = current_week
            user_data['showWeeklyIntro'] = show_intro

            if 'seenCodingIntros' not in user_data: user_data['seenCodingIntros'] = []
            if 'user_level' not in user_data: user_data['user_level'] = 'beginner'
            if 'progress' not in user_data: user_data['progress'] = {'week': 1, 'cycle': 0}

            user_data.pop('passwordHash', None)
            user_data.pop('password', None)
            return user_data

        if 'passwordHash' in user_data and check_password_hash(user_data['passwordHash'], password):
            processed_user_data = process_login_success(user_data, user_ref)
            return jsonify({"status": "success", "message": "로그인 성공!", "user": processed_user_data})
        elif 'password' in user_data and user_data['password'] == password:
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

# 사용자 레벨 업데이트 (수정 없음)
@app.route('/api/user/level/update', methods=['POST'])
def update_user_level():
    try:
        data = request.get_json()
        email = data.get('email')
        user_level = data.get('user_level')

        if not email:
            return jsonify({"status": "error", "message": "사용자 이메일 정보가 필요합니다."}), 400
        if user_level not in ['beginner', 'advanced']:
            return jsonify({"status": "error", "message": "유효하지 않은 레벨 값입니다 ('beginner' 또는 'advanced')."}), 400

        user_ref = db.collection('users').document(email)
        user_doc = user_ref.get()

        if not user_doc.exists:
            return jsonify({"status": "error", "message": "사용자 정보를 찾을 수 없습니다."}), 404

        user_ref.update({'user_level': user_level})

        return jsonify({"status": "success", "message": "학습 레벨이 업데이트되었습니다."})

    except Exception as e:
        print(f"Error in update_user_level: {e}")
        return jsonify({"status": "error", "message": f"레벨 업데이트 중 서버 오류 발생: {e}"}), 500

# --- ★★★★★ 여기부터 코드 제출 API 추가 ★★★★★ ---

def run_code_safely(student_code, test_code, timeout=5):
    """
    학생 코드와 테스트 코드를 결합하여 안전하게 실행하고 결과를 반환합니다.
    Args:
        student_code (str): 학생이 제출한 코드
        test_code (str): 검증에 사용할 테스트 코드
        timeout (int): 최대 실행 시간 (초)
    Returns:
        dict: {'success': bool, 'output': str, 'error': str}
              success: True면 성공, False면 실패
              output: 표준 출력 내용
              error: 표준 에러 내용 (AssertionError 포함)
    """
    full_code = student_code + "\n\n# --- Test Code ---\n" + test_code

    # 임시 파일 생성 (utf-8 인코딩 명시)
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as tmp_file:
        tmp_file.write(full_code)
        tmp_file_path = tmp_file.name

    process = None
    try:
        # subprocess를 사용하여 별도의 프로세스에서 코드 실행
        process = subprocess.Popen(
            ['python', tmp_file_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True, # 출력을 문자열로 받음
            encoding='utf-8' # 인코딩 명시
        )
        stdout, stderr = process.communicate(timeout=timeout) # 시간 제한 설정

        if process.returncode == 0 and not stderr:
            # 성공 (에러 없이 종료)
            return {'success': True, 'output': stdout, 'error': ''}
        else:
            # 실패 (오류 발생 또는 비정상 종료)
            # AssertionError가 stderr로 나올 수 있음
            error_message = stderr if stderr else f"비정상 종료 (종료 코드: {process.returncode})"
            return {'success': False, 'output': stdout, 'error': error_message}

    except subprocess.TimeoutExpired:
        if process:
            process.kill() # 시간 초과 시 프로세스 강제 종료
        return {'success': False, 'output': '', 'error': f'실행 시간 초과 ({timeout}초)'}
    except Exception as e:
        return {'success': False, 'output': '', 'error': f'코드 실행 중 예상치 못한 오류: {e}'}
    finally:
        # 임시 파일 삭제
        if os.path.exists(tmp_file_path):
            os.remove(tmp_file_path)

@app.route('/api/code/submit', methods=['POST'])
def submit_code():
    try:
        data = request.get_json()
        email = data.get('email')
        week = data.get('week')
        cycle_index = data.get('cycleIndex')
        student_code = data.get('studentCode')

        if not all([email, isinstance(week, int), isinstance(cycle_index, int), student_code is not None]):
            return jsonify({"status": "error", "message": "필수 정보(email, week, cycleIndex, studentCode)가 누락되었습니다."}), 400

        # 1. 사용자 레벨 조회
        user_doc_ref = db.collection('users').document(email)
        user_doc = user_doc_ref.get()
        if not user_doc.exists:
            return jsonify({"status": "error", "message": "사용자 정보를 찾을 수 없습니다."}), 404
        user_data = user_doc.to_dict()
        user_level = user_data.get('user_level', 'beginner')

        # 2. 시나리오 데이터 가져오기
        doc_id = f'week_{week}'
        scenario_doc = db.collection('scenarios').document(doc_id).get()
        if not scenario_doc.exists:
            return jsonify({"status": "error", "message": f"{week}주차 시나리오를 찾을 수 없습니다."}), 404
        scenario_data = scenario_doc.to_dict()
        cycles = scenario_data.get('cycles', [])
        if cycle_index < 0 or cycle_index >= len(cycles):
            return jsonify({"status": "error", "message": "유효하지 않은 사이클 인덱스입니다."}), 400
        cycle_data = cycles[cycle_index]

        # 3. 레벨에 맞는 테스트 코드 선택
        selected_test_code = cycle_data.get('testCode', '') # 기본값은 초보자용
        if user_level == 'advanced' and 'testCode_adv' in cycle_data:
            selected_test_code = cycle_data['testCode_adv']
            print(f"Using advanced test code for user {email}, week {week}, cycle {cycle_index}") # 디버깅 로그

        if not selected_test_code:
             # 테스트 코드가 없는 경우, 일단 성공으로 간주 (또는 다른 정책 적용 가능)
             print(f"No test code found for week {week}, cycle {cycle_index}. Assuming success.")
             # (선택) 여기서 제출 로그 기록
             # log_submission_to_firestore(email, class_id, week, cycle_index, True)
             return jsonify({"status": "success", "result": {"success": True, "message": ""}})

        # 4. 코드 안전하게 실행
        execution_result = run_code_safely(student_code, selected_test_code)

        # 5. 결과 반환
        response_data = {
            "success": execution_result['success'],
            "message": execution_result['error'] # 실패 시 에러 메시지 포함
        }

        # (선택) 여기서 제출 로그 기록
        # class_id = user_data.get('classId') # classId 필요
        # if class_id:
        #     log_submission_to_firestore(email, class_id, week, cycle_index, execution_result['success'], execution_result['error'])

        return jsonify({"status": "success", "result": response_data})

    except Exception as e:
        print(f"Error in submit_code: {e}")
        # 실제 운영 환경에서는 더 구체적인 오류 로깅 필요
        return jsonify({"status": "error", "message": f"코드 제출 처리 중 서버 오류 발생: {e}"}), 500

# (선택) 제출 로그 기록 함수 (Firestore 사용 예시)
# def log_submission_to_firestore(email, class_id, week, cycle_index, is_success, error_details=""):
#     try:
#         log_ref = db.collection('submission_logs').document()
#         log_ref.set({
#             'logId': log_ref.id,
#             'studentEmail': email,
#             'classId': class_id,
#             'week': week,
#             'cycle': cycle_index,
#             'isSuccess': is_success,
#             'error': str(error_details)[:500], # 오류 메시지 길이 제한
#             'submittedAt': firestore.SERVER_TIMESTAMP
#         })
#         print(f"Submission logged for {email}, week {week}, cycle {cycle_index}. Success: {is_success}")
#     except Exception as log_err:
#         print(f"Failed to log submission: {log_err}")

# --- ★★★★★ 코드 제출 API 추가 완료 ★★★★★ ---

# --- 나머지 기존 API들 (수정 없음) ---

# 진행 상황 업데이트
@app.route('/api/progress/update', methods=['POST'])
def update_progress():
    try:
        data = request.get_json()
        email = data.get('email')
        progress = data.get('progress')
        if not email or progress is None:
            return jsonify({"status": "error", "message": "필요한 정보(email, progress)가 누락되었습니다."}), 400
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
        live_code = data.get('liveCode', '')
        if not email:
            return jsonify({"status": "error", "message": "사용자 이메일 정보가 없습니다."}), 400

        db.collection('users').document(email).set({
            'liveCode': live_code,
            'lastActive': firestore.SERVER_TIMESTAMP
        }, merge=True)

        return jsonify({"status": "success"})
    except Exception as e:
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

        subject = class_details.get('subject', '제목 없음')
        year = class_details.get('year', '----')
        semester = class_details.get('semester', '-')
        department = class_details.get('department', '')
        section = class_details.get('section', '--')
        class_name = f"[{year} {semester}] {subject} ({department} {section}분반)"

        invite_code = generate_invite_code()
        new_class_ref = db.collection('classes').document()
        class_id = new_class_ref.id

        new_class_data = {
            'classId': class_id, 'className': class_name, 'details': class_details,
            'instructorEmail': instructor_email, 'inviteCode': invite_code,
            'students': [], 'createdAt': firestore.SERVER_TIMESTAMP
        }
        new_class_ref.set(new_class_data)

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

        batch = db.batch()
        student_emails = class_data.get('students', [])
        for email in student_emails:
            student_ref = db.collection('users').document(email)
            batch.update(student_ref, {'classId': firestore.DELETE_FIELD})
        batch.delete(class_ref)
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

        classes_ref = db.collection('classes').where('inviteCode', '==', invite_code).limit(1).stream()
        target_class_doc = next(classes_ref, None)
        if not target_class_doc:
            return jsonify({"status": "error", "message": "유효하지 않은 초대 코드입니다."}), 404

        class_id = target_class_doc.id
        class_data = target_class_doc.to_dict()

        student_doc_ref = db.collection('users').document(student_email)
        student_doc = student_doc_ref.get()
        if student_doc.exists and student_doc.to_dict().get('classId'):
             return jsonify({"status": "error", "message": "이미 다른 수업에 참여중입니다. 참여중인 수업을 탈퇴 후 시도해주세요."}), 400
        elif not student_doc.exists:
             return jsonify({"status": "error", "message": "가입되지 않은 사용자입니다. 회원가입을 먼저 진행해주세요."}), 404


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

        student_emails = class_info.get('students', [])
        student_details = []
        if student_emails:
            users_ref = db.collection('users')
            for email in student_emails:
                student_doc = users_ref.document(email).get()
                if student_doc.exists:
                    student_data = student_doc.to_dict()
                    student_data.pop('passwordHash', None)
                    student_data.pop('password', None)
                    if 'lastActive' in student_data and hasattr(student_data['lastActive'], 'isoformat'):
                        student_data['lastActive'] = student_data['lastActive'].isoformat()
                    student_details.append(student_data)

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

# 제출 로그 기록 (API 엔드포인트는 유지, 백엔드 채점 로직에서 호출 가능)
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

# 클래스 분석 데이터 가져오기 (f-string 오류 수정됨)
@app.route('/api/analytics/class/<class_id>', methods=['GET'])
def get_class_analytics(class_id):
    try:
        class_doc = db.collection('classes').document(class_id).get()
        if not class_doc.exists:
            return jsonify({"status": "error", "message": "클래스를 찾을 수 없습니다."}), 404
        class_info = class_doc.to_dict()

        logs_ref = db.collection('submission_logs').where('classId', '==', class_id).stream()
        logs = [log.to_dict() for log in logs_ref]
        total_submissions = len(logs)
        success_submissions = sum(1 for log in logs if log['isSuccess'])
        success_rate = round((success_submissions / total_submissions * 100), 2) if total_submissions > 0 else 0

        weekly_stats = {}
        for log in logs:
            week = log.get('week')
            if week is None: continue
            if week not in weekly_stats: weekly_stats[week] = {'success': 0, 'total': 0}
            weekly_stats[week]['total'] += 1
            if log['isSuccess']: weekly_stats[week]['success'] += 1
        weekly_success_rate = {f"{w}주차": round((d['success']/d['total']*100), 2) for w, d in weekly_stats.items() if d['total'] > 0}

        failed_logs = [log for log in logs if not log['isSuccess'] and log.get('week') is not None and log.get('cycle') is not None]
        scenario_titles = {}
        for w in set(log['week'] for log in failed_logs):
             scenario_doc = db.collection('scenarios').document(f'week_{w}').get()
             if scenario_doc.exists:
                 cycles = scenario_doc.to_dict().get('cycles', [])
                 scenario_titles[w] = {idx: cyc.get('title', f'사이클 {idx+1}') for idx, cyc in enumerate(cycles)}

        failed_cycle_titles = []
        for log in failed_logs:
            week_num = log.get('week')
            cycle_num = log.get('cycle')
            if week_num is not None and cycle_num is not None:
                cycle_title_or_default = scenario_titles.get(week_num, {}).get(cycle_num, f'사이클 {cycle_num + 1}')
                failed_cycle_titles.append(f"{week_num}주차: {cycle_title_or_default}")

        failure_counter = Counter(failed_cycle_titles)
        most_failed_cycles = failure_counter.most_common(5)

        student_emails = class_info.get('students', [])
        student_progress = []
        if student_emails:
            users_ref = db.collection('users')
            for email in student_emails:
                student_doc = users_ref.document(email).get()
                if student_doc.exists:
                    s_data = student_doc.to_dict()
                    progress = s_data.get('progress', {'week': 1, 'cycle': 0})
                    student_progress.append({
                        'name': s_data.get('name', '이름없음'), 'email': s_data.get('email'),
                        'week': progress.get('week', 1), 'cycle': progress.get('cycle', 0) + 1
                    })

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

            for rating in reflection.get('ratings', []):
                topic = rating.get('topic')
                comp = rating.get('comprehension')
                app = rating.get('application')
                if not topic: continue
                if topic not in reflection_analysis[week]['topics']:
                    reflection_analysis[week]['topics'][topic] = {'comprehension': [], 'application': []}
                if isinstance(comp, (int, float)): reflection_analysis[week]['topics'][topic]['comprehension'].append(comp)
                if isinstance(app, (int, float)): reflection_analysis[week]['topics'][topic]['application'].append(app)

            feedback = reflection.get('feedback', {})
            if feedback.get('meaningful'): reflection_analysis[week]['feedback_summary']['meaningful'].append(feedback['meaningful'])
            if feedback.get('difficult'): reflection_analysis[week]['feedback_summary']['difficult'].append(feedback['difficult'])
            if feedback.get('curious'): reflection_analysis[week]['feedback_summary']['curious'].append(feedback['curious'])

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
            "studentProgress": sorted(student_progress, key=lambda x: (-x['week'], -x['cycle'])),
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
        scenario_docs = {doc.id: doc.to_dict() for doc in db.collection('scenarios').stream()}

        for doc in reflections_ref:
            reflection = doc.to_dict()
            week = reflection.get('week')
            if week is None: continue

            week_key = f"week_{week}"
            if week_key in scenario_docs:
                week_data = scenario_docs[week_key]
                reflection['weekTitle'] = week_data.get('title', f'{week}주차')
                reflection['cycleTitles'] = [cyc.get('title', f'사이클 {i+1}') for i, cyc in enumerate(week_data.get('cycles', []))]

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
        intro_key = data.get('introKey')

        if not email or not intro_key:
            return jsonify({"status": "error", "message": "필수 정보(email, introKey)가 누락되었습니다."}), 400

        user_ref = db.collection('users').document(email)
        user_ref.update({'seenCodingIntros': firestore.ArrayUnion([intro_key])})

        return jsonify({"status": "success", "message": "확인되었습니다."})
    except Exception as e:
        print(f"Error in mark_coding_intro_seen: {e}")
        return jsonify({"status": "error", "message": f"오류 발생: {e}"}), 500

# --- 앱 실행 ---
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)