import random
import string
import json
from collections import Counter
from flask import Flask, render_template, jsonify, request
import firebase_admin
from firebase_admin import credentials, firestore
from werkzeug.security import generate_password_hash, check_password_hash

if not firebase_admin._apps:
    firebase_admin.initialize_app(options={
        'projectId': 'my-python-65210-65c44',
    })

db = firestore.client()
app = Flask(__name__, static_folder='static', template_folder='templates')

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

@app.route('/api/scenario/week/<int:week_num>')
def get_scenario(week_num):
    try:
        doc_id = f'week_{week_num}'
        scenario_doc = db.collection('scenarios').document(doc_id).get()
        if scenario_doc.exists:
            return jsonify(scenario_doc.to_dict())
        else:
            return jsonify({"status": "error", "message": "해당 주차의 시나리오를 찾을 수 없습니다."}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": f"서버 오류: {e}"}), 500

@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        name = data['name']
        email = data['email']
        password = data['password']
        role = data.get('role', 'student')
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
                'progress': {'week': 1, 'cycle': 0},
                'lastSeenIntroWeek': 0,
                'seenCodingIntros': [] # ★★★★★ 추가: 강의 회상 인트로 확인용 배열
            })
            return jsonify({"status": "success", "message": "회원가입이 완료되었습니다."}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": f"서버 오류: {e}"}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data['email']
        password = data['password']
        user_ref = db.collection('users').document(email)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({"status": "error", "message": "이메일 또는 비밀번호가 올바르지 않습니다."}), 401

        user_data = user_doc.to_dict()
        
        def process_login_logic(user_data):
            show_intro = False
            current_week = user_data.get('progress', {}).get('week', 1)
            last_seen_week = user_data.get('lastSeenIntroWeek', 0)

            if current_week > last_seen_week:
                show_intro = True
                user_ref.update({'lastSeenIntroWeek': current_week})
                user_data['lastSeenIntroWeek'] = current_week
            
            user_data['showWeeklyIntro'] = show_intro
            
            if 'seenCodingIntros' not in user_data:
                user_data['seenCodingIntros'] = []

            user_data['password'] = password
            return user_data

        if 'passwordHash' in user_data and check_password_hash(user_data['passwordHash'], password):
            user_data.pop('passwordHash', None)
            user_data.pop('password', None)
            
            user_data = process_login_logic(user_data)
            
            return jsonify({"status": "success", "message": "로그인 성공!", "user": user_data})
        elif 'password' in user_data and user_data['password'] == password:
             user_data.pop('password', None)
             
             user_data = process_login_logic(user_data)
             
             return jsonify({"status": "success", "message": "로그인 성공! (레거시 인증)", "user": user_data})
        else:
            return jsonify({"status": "error", "message": "이메일 또는 비밀번호가 올바르지 않습니다."}), 401
    except Exception as e:
        return jsonify({"status": "error", "message": f"서버 오류: {e}"}), 500


@app.route('/api/progress/update', methods=['POST'])
def update_progress():
    try:
        data = request.get_json()
        email = data['email']
        progress = data['progress']
        if not email or not progress:
            return jsonify({"status": "error", "message": "필요한 정보가 누락되었습니다."}), 400
        db.collection('users').document(email).update({'progress': progress})
        return jsonify({"status": "success", "message": "진행 상황이 저장되었습니다."})
    except Exception as e:
        return jsonify({"status": "error", "message": f"서버 오류: {e}"}), 500

@app.route('/api/livecode/update', methods=['POST'])
def update_live_code():
    try:
        data = request.get_json()
        email = data.get('email')
        live_code = data.get('liveCode')
        if not email:
            return jsonify({"status": "error", "message": "사용자 정보가 없습니다."}), 400
        
        db.collection('users').document(email).set({
            'liveCode': live_code,
            'lastActive': firestore.SERVER_TIMESTAMP
        }, merge=True)
        
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": f"코드 업데이트 중 오류 발생: {e}"}), 500

@app.route('/api/pause/set', methods=['POST'])
def set_pause_state():
    try:
        data = request.get_json()
        email = data.get('email')
        pause_state = data.get('pauseState')
        if not email or not pause_state:
            return jsonify({"status": "error", "message": "필수 정보가 누락되었습니다."}), 400
        
        db.collection('users').document(email).update({'pauseState': pause_state})
        return jsonify({"status": "success", "message": "일시정지 상태가 저장되었습니다."})
    except Exception as e:
        return jsonify({"status": "error", "message": f"상태 저장 중 오류 발생: {e}"}), 500

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
        return jsonify({"status": "error", "message": f"상태 해제 중 오류 발생: {e}"}), 500

def generate_invite_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

@app.route('/api/classes', methods=['GET'])
def get_classes():
    instructor_email = request.args.get('email')
    if not instructor_email:
        return jsonify({"status": "error", "message": "교수자 이메일 정보가 필요합니다."}), 400
    try:
        classes_ref = db.collection('classes').where('instructorEmail', '==', instructor_email).order_by('createdAt', direction=firestore.Query.DESCENDING).stream()
        classes = [doc.to_dict() for doc in classes_ref]
        return jsonify({"status": "success", "classes": classes})
    except Exception as e:
        return jsonify({"status": "error", "message": f"수업 목록을 불러오는 중 오류 발생: {e}"}), 500

@app.route('/api/classes/create', methods=['POST'])
def create_class():
    try:
        data = request.get_json()
        class_details = data.get('classDetails')
        instructor_email = data.get('instructorEmail')
        
        if not class_details or not instructor_email:
            return jsonify({"status": "error", "message": "수업 상세 정보와 교수자 정보가 필요합니다."}), 400
        
        subject = class_details.get('subject', '제목 없음')
        year = class_details.get('year', '2025')
        semester = class_details.get('semester', '1학기')
        department = class_details.get('department', '')
        section = class_details.get('section', '01')
        
        class_name = f"[{year} {semester}] {subject} ({department} {section}분반)"
        
        invite_code = generate_invite_code()
        class_id = db.collection('classes').document().id
        new_class_data = {
            'classId': class_id,
            'className': class_name,
            'details': class_details,
            'instructorEmail': instructor_email,
            'inviteCode': invite_code,
            'students': [],
            'createdAt': firestore.SERVER_TIMESTAMP
        }
        db.collection('classes').document(class_id).set(new_class_data)
        
        response_data = new_class_data.copy()
        if 'createdAt' in response_data:
            del response_data['createdAt']
            
        return jsonify({"status": "success", "message": "새로운 수업이 개설되었습니다.", "class": response_data}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": f"수업 개설 중 오류 발생: {e}"}), 500

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
        
        if class_doc.to_dict().get('instructorEmail') != instructor_email:
            return jsonify({"status": "error", "message": "수업을 삭제할 권한이 없습니다."}), 403

        student_emails = class_doc.to_dict().get('students', [])
        batch = db.batch()

        for email in student_emails:
            student_ref = db.collection('users').document(email)
            batch.update(student_ref, {'classId': firestore.DELETE_FIELD})
        
        batch.delete(class_ref)
        batch.commit()
        
        return jsonify({"status": "success", "message": "수업이 성공적으로 삭제되었습니다."})
    except Exception as e:
        return jsonify({"status": "error", "message": f"수업 삭제 중 오류 발생: {e}"}), 500

@app.route('/api/classes/join', methods=['POST'])
def join_class():
    try:
        data = request.get_json()
        invite_code = data.get('inviteCode')
        student_email = data.get('studentEmail')
        if not invite_code or not student_email:
            return jsonify({"status": "error", "message": "초대 코드와 학생 정보가 필요합니다."}), 400
        classes_ref = db.collection('classes').where('inviteCode', '==', invite_code).limit(1).stream()
        target_class_doc = None
        for doc in classes_ref:
            target_class_doc = doc
        if not target_class_doc:
            return jsonify({"status": "error", "message": "유효하지 않은 초대 코드입니다."}), 404
        
        class_id = target_class_doc.id
        
        student_doc = db.collection('users').document(student_email).get()
        if student_doc.exists and student_doc.to_dict().get('classId'):
             return jsonify({"status": "error", "message": "이미 다른 수업에 참여중입니다. 참여중인 수업을 탈퇴 후 시도해주세요."}), 400
        
        db.collection('classes').document(class_id).update({'students': firestore.ArrayUnion([student_email])})
        db.collection('users').document(student_email).set({'classId': class_id}, merge=True)
        
        return jsonify({"status": "success", "message": f"'{target_class_doc.to_dict()['className']}' 수업에 참여했습니다!", "classId": class_id})
    except Exception as e:
        return jsonify({"status": "error", "message": f"수업 참여 중 오류 발생: {e}"}), 500

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
                    student_details.append(student_data)
        return jsonify({"status": "success", "classInfo": class_info, "students": student_details})
    except Exception as e:
        return jsonify({"status": "error", "message": f"수업 상세 정보를 불러오는 중 오류 발생: {e}"}), 500

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
            'questionId': question_ref.id,
            'classId': class_id,
            'studentEmail': student_email,
            'question': question_text,
            'progress': progress,
            'characterContext': character_context,
            'isResolved': False,
            'isNotified': False,
            'answer': '',
            'createdAt': firestore.SERVER_TIMESTAMP
        })
        return jsonify({"status": "success", "message": "질문이 성공적으로 등록되었습니다."}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": f"질문 등록 중 오류 발생: {e}"}), 500

@app.route('/api/question/answer', methods=['POST'])
def answer_question():
    try:
        data = request.get_json()
        question_id = data.get('questionId')
        answer_text = data.get('answer')

        if not question_id or not answer_text:
            return jsonify({"status": "error", "message": "질문 ID와 답변 내용이 필요합니다."}), 400
            
        db.collection('questions').document(question_id).update({
            'answer': answer_text,
            'isResolved': True,
            'isNotified': False
        })
        return jsonify({"status": "success", "message": "답변이 등록되었습니다."})
    except Exception as e:
        return jsonify({"status": "error", "message": f"답변 등록 중 오류 발생: {e}"}), 500

@app.route('/api/questions/my', methods=['GET'])
def get_my_questions():
    student_email = request.args.get('email')
    if not student_email:
        return jsonify({"status": "error", "message": "학생 이메일 정보가 필요합니다."}), 400
    try:
        questions_ref = db.collection('questions').where('studentEmail', '==', student_email).order_by('createdAt', direction=firestore.Query.DESCENDING).stream()
        questions = []
        for doc in questions_ref:
            q_data = doc.to_dict()
            if 'createdAt' in q_data and hasattr(q_data['createdAt'], 'isoformat'):
                q_data['createdAt'] = q_data['createdAt'].isoformat()
            questions.append(q_data)
        return jsonify({"status": "success", "questions": questions})
    except Exception as e:
        return jsonify({"status": "error", "message": f"질문 목록을 불러오는 중 오류 발생: {e}"}), 500
        
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
            'studentEmail': data.get('email'),
            'classId': data.get('classId'),
            'week': data.get('week'),
            'cycle': data.get('cycle'),
            'isSuccess': data.get('isSuccess'),
            'error': data.get('error', ''),
            'submittedAt': firestore.SERVER_TIMESTAMP
        })
        return jsonify({"status": "success", "message": "제출 기록이 저장되었습니다."}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": f"로그 저장 중 오류 발생: {e}"}), 500

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
            'studentEmail': data.get('email'),
            'classId': data.get('classId'),
            'week': data.get('week'),
            'ratings': data.get('ratings'),
            'feedback': data.get('feedback'),
            'submittedAt': firestore.SERVER_TIMESTAMP
        })
        return jsonify({"status": "success", "message": "업무일지가 저장되었습니다."}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": f"업무일지 저장 중 오류 발생: {e}"}), 500

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
        success_rate = (success_submissions / total_submissions * 100) if total_submissions > 0 else 0

        weekly_stats = {}
        for log in logs:
            week = log['week']
            if week not in weekly_stats:
                weekly_stats[week] = {'success': 0, 'total': 0}
            weekly_stats[week]['total'] += 1
            if log['isSuccess']:
                weekly_stats[week]['success'] += 1
        
        weekly_success_rate = {f"{w}주차": (d['success']/d['total']*100) for w, d in weekly_stats.items()}

        failed_logs = [log for log in logs if not log['isSuccess']]
        failure_counter = Counter(f"{log['week']}주차 사이클 {log['cycle'] + 1}" for log in failed_logs)
        most_failed_cycles = failure_counter.most_common(5)

        student_emails = class_info.get('students', [])
        student_progress = []
        if student_emails:
            users_ref = db.collection('users')
            for email in student_emails:
                student_doc = users_ref.document(email).get()
                if student_doc.exists:
                    s_data = student_doc.to_dict()
                    progress = s_data.get('progress', {})
                    student_progress.append({
                        'name': s_data.get('name'),
                        'email': s_data.get('email'),
                        'week': progress.get('week', 1),
                        'cycle': progress.get('cycle', 0) + 1
                    })
        
        reflections_ref = db.collection('reflections').where('classId', '==', class_id).stream()
        reflections = [r.to_dict() for r in reflections_ref]
        
        reflection_analysis = {}
        for reflection in reflections:
            week = reflection['week']
            if week not in reflection_analysis:
                reflection_analysis[week] = {
                    'topics': {},
                    'feedback_summary': {'meaningful': [], 'difficult': [], 'curious': []},
                    'participant_count': set()
                }
            
            reflection_analysis[week]['participant_count'].add(reflection['studentEmail'])

            for rating in reflection.get('ratings', []):
                topic = rating['topic']
                if topic not in reflection_analysis[week]['topics']:
                    reflection_analysis[week]['topics'][topic] = {'comprehension': [], 'application': []}
                reflection_analysis[week]['topics'][topic]['comprehension'].append(rating['comprehension'])
                reflection_analysis[week]['topics'][topic]['application'].append(rating['application'])
            
            feedback = reflection.get('feedback', {})
            if feedback.get('meaningful'):
                reflection_analysis[week]['feedback_summary']['meaningful'].append(feedback['meaningful'])
            if feedback.get('difficult'):
                reflection_analysis[week]['feedback_summary']['difficult'].append(feedback['difficult'])
            if feedback.get('curious'):
                reflection_analysis[week]['feedback_summary']['curious'].append(feedback['curious'])

        for week, data in reflection_analysis.items():
            for topic, ratings in data['topics'].items():
                comp_avg = sum(ratings['comprehension']) / len(ratings['comprehension']) if ratings['comprehension'] else 0
                app_avg = sum(ratings['application']) / len(ratings['application']) if ratings['application'] else 0
                reflection_analysis[week]['topics'][topic] = {
                    'comprehension_avg': round(comp_avg, 2),
                    'application_avg': round(app_avg, 2)
                }
            reflection_analysis[week]['participant_count'] = len(data['participant_count'])


        return jsonify({
            "status": "success",
            "className": class_info.get('className'),
            "totalSubmissions": total_submissions,
            "successRate": round(success_rate, 2),
            "weeklySuccessRate": weekly_success_rate,
            "mostFailedCycles": most_failed_cycles,
            "studentProgress": sorted(student_progress, key=lambda x: (-x['week'], -x['cycle'])),
            "reflectionAnalysis": reflection_analysis
        })

    except Exception as e:
        return jsonify({"status": "error", "message": f"분석 데이터 로드 중 오류 발생: {e}"}), 500

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
            
            week_key = f"week_{reflection['week']}"
            if week_key in scenario_docs:
                week_data = scenario_docs[week_key]
                reflection['weekTitle'] = week_data.get('title', '제목 없음')
                reflection['cycleTitles'] = [cycle.get('title', '제목 없음') for cycle in week_data.get('cycles', [])]
            
            if 'submittedAt' in reflection and hasattr(reflection['submittedAt'], 'isoformat'):
                reflection['submittedAt'] = reflection['submittedAt'].isoformat()
            growth_data.append(reflection)
            
        return jsonify({"status": "success", "data": growth_data})
    except Exception as e:
        return jsonify({"status": "error", "message": f"성장 기록을 불러오는 중 오류 발생: {e}"}), 500

# ★★★★★ 추가: 강의 회상 인트로 확인 기록용 API ★★★★★
@app.route('/api/coding-intro/seen', methods=['POST'])
def mark_coding_intro_seen():
    try:
        data = request.get_json()
        email = data.get('email')
        intro_key = data.get('introKey') # 예: 'week1_cycle0'

        if not email or not intro_key:
            return jsonify({"status": "error", "message": "필수 정보가 누락되었습니다."}), 400

        user_ref = db.collection('users').document(email)
        # ArrayUnion을 사용해 중복 없이 intro_key를 배열에 추가
        user_ref.update({
            'seenCodingIntros': firestore.ArrayUnion([intro_key])
        })
        
        return jsonify({"status": "success", "message": "확인되었습니다."})
    except Exception as e:
        return jsonify({"status": "error", "message": f"오류 발생: {e}"}), 500
