import time
from typing import Any, Dict, Callable

# ==========================================
# 1. STATE (DURUM) TANIMI
# ==========================================
def create_initial_state(input_data: Dict[str, Any] = None) -> Dict[str, Any]:
    return {
        "status": "running",
        "next_task": "load_data",
        "data": input_data or {},
        "logs": [],
        "errors": [],
        "step_count": 0
    }

def log(state: Dict[str, Any], message: str):
    print(message)
    state["logs"].append(message)

# ==========================================
# 2. GÖREV (TASK) FONKSİYONLARI
# ==========================================
def load_data_task(state: Dict[str, Any]) -> Dict[str, Any]:
    log(state, "[Görev: Veri Yükleme] Sistem ayarları ve girdiler hazırlanıyor...")
    time.sleep(0.5)
    
    # Simüle edilmiş veri yükleme
    state["data"]["mesh_size"] = 1000
    state["data"]["laser_power"] = 250
    
    state["next_task"] = "run_simulation"
    return state

def run_simulation_task(state: Dict[str, Any]) -> Dict[str, Any]:
    log(state, "[Görev: Simülasyon] Termal analiz başlatılıyor...")
    time.sleep(1)
    
    power = state["data"].get("laser_power", 0)
    if power < 100:
        state["errors"].append("Lazer gücü çok düşük!")
        state["next_task"] = "error_handler"
    else:
        state["data"]["max_temperature"] = 1500
        log(state, "[Görev: Simülasyon] Analiz başarılı.")
        state["next_task"] = "generate_report"
        
    return state

def generate_report_task(state: Dict[str, Any]) -> Dict[str, Any]:
    log(state, "[Görev: Rapor] Sonuçlar kaydediliyor...")
    time.sleep(0.5)
    
    state["data"]["report_generated"] = True
    state["next_task"] = "end"
    return state

def error_handler_task(state: Dict[str, Any]) -> Dict[str, Any]:
    log(state, f"[Görev: Hata Yöneticisi] Hatalar tespit edildi: {state['errors']}")
    # Hata kurtarma veya güvenli durdurma işlemleri
    state["next_task"] = "end"
    state["status"] = "failed"
    return state

# ==========================================
# 3. YÖNLENDİRİCİ (ROUTER)
# ==========================================
TASK_REGISTRY: Dict[str, Callable] = {
    "load_data": load_data_task,
    "run_simulation": run_simulation_task,
    "generate_report": generate_report_task,
    "error_handler": error_handler_task,
}

def run_orchestrator(input_data: Dict[str, Any] = None):
    print("=== İş Akışı (Pipeline) Başlıyor ===")
    state = create_initial_state(input_data)
    
    while state["status"] == "running":
        current_task_name = state["next_task"]
        
        # Bitiş kontrolü
        if current_task_name == "end":
            state["status"] = "completed"
            break
            
        # Sonsuz döngü koruması
        state["step_count"] += 1
        if state["step_count"] > 20:
            log(state, "[Sistem] Maksimum adım limitine ulaşıldı!")
            state["status"] = "timeout"
            break
            
        # İlgili görevi bul ve çalıştır
        task_func = TASK_REGISTRY.get(current_task_name)
        if not task_func:
            log(state, f"[Sistem] Bilinmeyen görev: {current_task_name}")
            state["status"] = "error"
            break
            
        # State'i güncelle
        state = task_func(state)

    # Final Raporu
    print("\n=== İş Akışı Özeti ===")
    print(f"Son Durum : {state['status'].upper()}")
    print(f"Adım Sayısı: {state['step_count']}")
    print(f"Elde Edilen Veriler: {state['data']}")
    if state["errors"]:
        print(f"Hatalar: {state['errors']}")

if __name__ == "__main__":
    # Test 1: Başarılı Senaryo
    run_orchestrator({"job_id": "LPBF-001"})
