import urllib.request
import urllib.error
import json
import sys

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000/api"

def api_call(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        return e.code, json.loads(err_body) if err_body else {}

def main():
    print("=" * 65)
    print("HARVESTLINK AI - VERIFICATION SUITE")
    print("=" * 65)

    # 1. Test 5 Farmer Logins
    for i in range(1, 6):
        u = f"farmer{i}"
        status, res = api_call("/auth/login", method="POST", data={"username": u, "password": "1234", "role": "farmer"})
        assert status == 200, f"Login failed for {u}: {res}"
        user = res["user"]
        assert user["username"] == u
        assert user["role"] == "farmer"
        print(f"[PASS] Farmer login: {u} -> Name: {user['profile']['name']}, Farm: {user['profile']['farm_name']}")

    # 2. Test Buyer Login
    status, res = api_call("/auth/login", method="POST", data={"username": "buyer1", "password": "1234", "role": "buyer"})
    assert status == 200, f"Buyer login failed: {res}"
    buyer_token = res["access_token"]
    buyer_id = res["user"]["buyer_id"]
    print(f"[PASS] Buyer login: buyer1 -> {res['user']['profile']['name']}")

    # 3. Test Transporter Login
    status, res = api_call("/auth/login", method="POST", data={"username": "transporter1", "password": "1234", "role": "transporter"})
    assert status == 200, f"Transporter login failed: {res}"
    print(f"[PASS] Transporter login: transporter1 -> Fleet: {len(res['user']['profile']['vehicles'])} vehicles")

    # 4. Test Admin Login
    status, res = api_call("/auth/login", method="POST", data={"username": "admin", "password": "1234", "role": "admin"})
    assert status == 200, f"Admin login failed: {res}"
    print(f"[PASS] Admin login: admin")

    # 5. Farmer1 adds 1500 kg Tomato Grade A
    status, res_f1 = api_call("/auth/login", method="POST", data={"username": "farmer1", "password": "1234", "role": "farmer"})
    f1_id = res_f1["user"]["farmer_id"]
    f1_token = res_f1["access_token"]

    harvest_data = {
        "farmer_id": f1_id,
        "crop": "Tomato",
        "estimated_quantity": 1500.0,
        "quality_grade": "A",
        "harvest_date": "2026-10-02",
        "available_date": "2026-10-02",
        "location": "Kolar, Karnataka",
        "expected_price": 25.0,
        "status": "sorted"
    }
    status, harvest = api_call("/harvests", method="POST", data=harvest_data, token=f1_token)
    assert status == 201, f"Create harvest failed: {harvest}"
    harvest_id = harvest["id"]
    print(f"\n[PASS] Farmer1 added harvest: #{harvest_id} - {harvest['estimated_quantity']} kg Grade {harvest['quality_grade']} {harvest['crop']}")

    # 6. Buyer sees available harvests
    status, available = api_call("/harvests/available")
    assert status == 200
    found = [h for h in available if h["id"] == harvest_id]
    assert len(found) > 0, "Harvest not found in buyer available harvests"
    print(f"[PASS] Buyer fetches available harvests: Found #{harvest_id} ({found[0]['available_quantity']} kg)")

    # 7. Buyer requests produce
    req_payload = {
        "buyer_id": buyer_id,
        "harvest_id": harvest_id,
        "quantity": 1500.0,
        "quality_grade": "A",
        "delivery_date": "2026-10-03",
        "delivery_location": "Bangalore, Karnataka",
        "message": "Need 1500 kg Grade A tomatoes for restaurant chain."
    }
    status, req_res = api_call("/buyer-requests", method="POST", data=req_payload, token=buyer_token)
    assert status == 201, f"Buyer request failed: {req_res}"
    order_id = req_res["order_id"]
    print(f"[PASS] Buyer created request -> Order #{order_id} generated")

    # 8. Reset truck statuses to 'available' so optimizer can find the combination
    for vid in range(1, 5):
        st, res = api_call(f"/vehicles/{vid}/status", method="PUT", data={"status": "available"})
        assert st == 200, f"Reset vehicle {vid} failed: {res}"

    # Farmer accepts order -> AI Transport Optimization runs
    status, accept_res = api_call(f"/orders/{order_id}/accept", method="POST", token=f1_token)
    assert status == 200, f"Accept order failed: {accept_res}"
    print(f"[PASS] Farmer accepted Order #{order_id}")

    # Verify AI Recommendation
    rec = accept_res.get("transport_recommendation")
    if not rec:
        status, rec = api_call(f"/transport/recommendations/{order_id}")
        assert status == 200, f"Get recommendation failed: {rec}"
    else:
        # Also verify GET endpoint works
        status, get_rec = api_call(f"/transport/recommendations/{order_id}")
        assert status == 200, f"GET recommendation endpoint failed: {get_rec}"
        rec = get_rec
    print("\n[AI TRANSPORT OPTIMIZATION RESULT]")
    print(f"   Order #{order_id} Required: {rec['required_quantity']} kg")
    print(f"   Allocated Capacity: {rec['allocated_capacity']} kg (Unused: {rec['unused_capacity']} kg)")
    print(f"   Total Transport Cost: ₹{rec['total_cost']}")
    print(f"   Trucks Used ({rec['trucks_count']}):")
    for t in rec["trucks"]:
        print(f"     - {t['vehicle_number']}: capacity {t['capacity']} kg (assigned: {t['assigned_capacity']} kg, cost: ₹{t['cost']})")
    print(f"   AI Explanation: {rec['reason']}")

    assert rec['allocated_capacity'] == 1500.0, f"Expected 1500 kg, got {rec['allocated_capacity']}"
    assert rec['total_cost'] == 3200.0, f"Expected 3200, got {rec['total_cost']}"
    assert rec['trucks_count'] == 3, f"Expected 3 trucks, got {rec['trucks_count']}"

    # 9. Transporter fetches jobs
    status, jobs = api_call("/transport/jobs")
    assert status == 200
    job = next((j for j in jobs if j["order_id"] == order_id), None)
    assert job is not None, f"Order #{order_id} not found in transporter jobs"
    print(f"\n[PASS] Transporter sees assigned job for Order #{order_id}")
    print(f"   Pickup: {job['farmer']['pickup_location']} | Delivery: {job['buyer']['delivery_location']}")
    print(f"   Assigned Trucks: {len(job['assigned_trucks'])}")

    # 10. Transporter updates statuses: PICKUP STARTED -> IN TRANSIT -> DELIVERED
    for st in ["PICKUP STARTED", "IN TRANSIT", "DELIVERED"]:
        status, update_res = api_call(f"/transport/orders/{order_id}/update-status", method="POST", data={"status": st})
        assert status == 200, f"Update status to {st} failed: {update_res}"
        print(f"[PASS] Transporter updated status -> {st}")

    # 11. Admin verifies full connected order details & timeline
    status, detail = api_call(f"/orders/{order_id}/detail")
    assert status == 200
    print(f"\n[PASS] Admin Order #{order_id} Connected View:")
    print(f"   Farmer: {detail['farmer']['username']} ({detail['farmer']['name']})")
    print(f"   Buyer: {detail['buyer']['name']}")
    print(f"   Transporter: {detail['transporter']['name']}")
    print(f"   Status: {detail['status']} ({detail['display_status']})")
    print(f"   Timeline stages completed:")
    for s in detail["timeline"]:
        print(f"     {'[DONE]' if s['done'] else '[PEND]'} {s['name']}")

    assert detail['status'] == "delivered"
    assert all(s["done"] for s in detail["timeline"]), "All timeline stages should be done"

    print("\n" + "=" * 65)
    print("ALL 11 END-TO-END REAL-TIME SPECIFICATIONS VERIFIED SUCCESSFULLY!")
    print("=" * 65)

if __name__ == "__main__":
    main()
