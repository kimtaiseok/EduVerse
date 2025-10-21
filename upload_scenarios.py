import json
import firebase_admin
from firebase_admin import credentials, firestore

SERVICE_ACCOUNT_KEY_FILE = "serviceAccountKey.json"
SCENARIO_JSON_FILE = "scenario.json"
COLLECTION_NAME = "scenarios"

def upload_scenarios():
    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_FILE)
            firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✅ Firestore 데이터베이스에 성공적으로 연결되었습니다.")
    except Exception as e:
        print(f"❌ Firestore 연결 실패: {e}")
        return

    try:
        with open(SCENARIO_JSON_FILE, 'r', encoding='utf-8') as f:
            scenarios_data = json.load(f)
        print(f"✅ '{SCENARIO_JSON_FILE}' 파일을 성공적으로 읽었습니다.")
    except Exception as e:
        print(f"❌ 파일 읽기 실패: {e}")
        return

    print("\nFirestore에 시나리오 업로드를 시작합니다...")
    try:
        weeks_array = scenarios_data.get('weeks', [])
        if not weeks_array:
            print("❌ 'scenario.json' 파일에서 'weeks' 배열을 찾을 수 없습니다. 파일 구조를 확인해주세요.")
            return

        for week_data in weeks_array:
            week_number = week_data.get('week')
            if week_number is None:
                print("⚠️ 'week' 번호가 없는 주차 데이터가 있어 건너뜁니다.")
                continue
            
            doc_id = f"week_{week_number}"
            db.collection(COLLECTION_NAME).document(doc_id).set(week_data)
            print(f"  -> '{doc_id}' 업로드 완료.")
        
        print("\n🎉 모든 주차 시나리오를 성공적으로 Firestore에 업로드했습니다!")
    except Exception as e:
        print(f"❌ 업로드 중 오류 발생: {e}")

if __name__ == "__main__":
    upload_scenarios()