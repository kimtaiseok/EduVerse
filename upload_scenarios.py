import json
import firebase_admin
from firebase_admin import credentials, firestore

SERVICE_ACCOUNT_KEY_FILE = "serviceAccountKey.json"
SCENARIO_JSON_FILE = "scenario.json"
COLLECTION_NAME = "scenarios"

def upload_scenarios():
    # 1. Firestore 연결
    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_FILE)
            firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✅ Firestore 데이터베이스에 성공적으로 연결되었습니다.")
    except Exception as e:
        print(f"❌ Firestore 연결 실패: {e}")
        return

    # 2. scenario.json 파일 읽기 및 기본 검증
    try:
        with open(SCENARIO_JSON_FILE, 'r', encoding='utf-8') as f:
            # ★★★ 수정: scenarios_data가 이제 리스트라고 가정 ★★★
            scenarios_data_list = json.load(f)
        print(f"✅ '{SCENARIO_JSON_FILE}' 파일을 성공적으로 읽었습니다.")
    except json.JSONDecodeError as e:
        print(f"❌ '{SCENARIO_JSON_FILE}' 파일이 유효한 JSON 형식이 아닙니다. JSON 구문을 확인해주세요: {e}")
        return
    except Exception as e:
        print(f"❌ 파일 읽기 실패: {e}")
        return

    print("\nFirestore에 시나리오 업로드를 시작합니다...")
    try:
        # ★★★ 수정: 최상위 데이터가 리스트인지 확인 ★★★
        if not isinstance(scenarios_data_list, list):
            print(f"❌ '{SCENARIO_JSON_FILE}' 파일의 최상위 구조가 리스트(배열, '[ ]')가 아닙니다. 파일 시작 부분을 확인해주세요.")
            return
        if not scenarios_data_list: # 리스트가 비어있는 경우
             print("⚠️ 'scenario.json' 파일이 비어 있습니다. 업로드할 데이터가 없습니다.")
             return

        # ★★★ 수정: scenarios_data_list (리스트 자체)를 직접 순회 ★★★
        success_count = 0
        for index, week_data in enumerate(scenarios_data_list):
            # 5-1. 주차 데이터가 딕셔너리인지 확인
            if not isinstance(week_data, dict):
                print(f"⚠️ {index + 1}번째 주차 항목이 딕셔너리(객체)가 아니어서 건너뜁니다: {week_data}")
                continue

            # 5-2. 'week' 번호 확인
            week_number = week_data.get('week')
            if week_number is None:
                print(f"⚠️ {index + 1}번째 주차 항목에 'week' 번호가 없어서 건너뜁니다.")
                continue

            # 5-3. Firestore 문서 ID 생성 (숫자형으로 변환 시도)
            try:
                doc_id = f"week_{int(week_number)}"
            except ValueError:
                print(f"⚠️ {index + 1}번째 주차 항목 'week' 번호({week_number})가 숫자가 아니어서 건너뜁니다.")
                continue

            # 5-4. Firestore에 문서 업로드 (set 메서드는 덮어쓰기)
            db.collection(COLLECTION_NAME).document(doc_id).set(week_data)
            print(f"  -> '{doc_id}' 업로드 완료.")
            success_count += 1

        print(f"\n🎉 총 {success_count}개의 유효한 주차 시나리오를 Firestore에 성공적으로 업로드/업데이트했습니다!")

    except AttributeError as e:
         print(f"❌ 업로드 중 예상치 못한 AttributeError 발생: {e}")
         print("   스크립트가 리스트에서 .get() 과 같은 딕셔너리 메소드를 호출하려고 했을 가능성이 높습니다.")
         print("   scenario.json 파일 구조와 스크립트의 데이터 처리 로직을 다시 한번 확인해주세요.")
    except Exception as e:
        print(f"❌ 업로드 중 오류 발생: {e}")

if __name__ == "__main__":
    upload_scenarios()