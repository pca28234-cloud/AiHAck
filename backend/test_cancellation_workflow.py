import asyncio
import httpx

BASE_URL = "http://127.0.0.1:8000"

async def test_cancellation():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        print("--- Step 1: Login as farmer1 ---")
        f_login = await client.post("/api/auth/login", json={"username": "farmer1", "password": "1234"})
        assert f_login.status_code == 200, f"Farmer login failed: {f_login.text}"
        farmer_token = f_login.json()["access_token"]
        f_headers = {"Authorization": f"Bearer {farmer_token}"}
        
        print("--- Step 2: Login as buyer1 ---")
        b_login = await client.post("/api/auth/login", json={"username": "buyer1", "password": "1234"})
        assert b_login.status_code == 200, f"Buyer login failed: {b_login.text}"
        buyer_token = b_login.json()["access_token"]
        b_headers = {"Authorization": f"Bearer {buyer_token}"}

        print("--- Step 3: Farmer creates a harvest of 300 kg Tomato Grade A ---")
        h_res = await client.post("/api/harvests", json={
            "farmer_id": 1,
            "crop": "Tomato",
            "estimated_quantity": 300.0,
            "quality_grade": "A",
            "harvest_date": "2026-10-02",
            "available_date": "2026-10-02",
            "location": "Kolar District",
            "expected_price": 28.0,
            "status": "estimated"
        }, headers=f_headers)
        assert h_res.status_code == 201, f"Create harvest failed: {h_res.text}"
        harvest = h_res.json()
        harvest_id = harvest["id"]
        print(f"Created harvest #{harvest_id}, total quantity: {harvest['estimated_quantity']}")

        print("--- Step 4: Buyer requests 100 kg from this harvest ---")
        req_res = await client.post("/api/buyer-requests", json={
            "buyer_id": 1,
            "harvest_id": harvest_id,
            "quantity": 100.0,
            "quality_grade": "A",
            "delivery_date": "2026-10-03",
            "delivery_location": "Bangalore City",
            "message": "Testing cancellation and inventory restoration"
        }, headers=b_headers)
        assert req_res.status_code == 201, f"Buyer request failed: {req_res.text}"
        req_data = req_res.json()
        order_id = req_data.get("order_id")
        request_id = req_data.get("id")
        print(f"Buyer request #{request_id} created with order #{order_id}")

        print("--- Step 5: Verify inventory reservation ---")
        # Check harvest available quantity
        all_h = await client.get("/api/harvests")
        h_curr = next(h for h in all_h.json() if h["id"] == harvest_id)
        print(f"Harvest before cancellation: Total={h_curr['estimated_quantity']}, Reserved={h_curr.get('reserved_quantity')}, Available={h_curr.get('available_quantity')}")
        assert h_curr.get("available_quantity") == 200.0, f"Expected 200.0 available, got {h_curr.get('available_quantity')}"

        print("--- Step 6: Farmer accepts the order ---")
        acc_res = await client.post(f"/api/orders/{order_id}/accept", headers=f_headers)
        assert acc_res.status_code == 200, f"Accept order failed: {acc_res.text}"
        print(f"Order #{order_id} accepted and trucks allocated.")

        print("--- Step 7: Buyer cancels the order ---")
        cancel_res = await client.post(f"/api/orders/{order_id}/cancel", json={
            "reason": "Buyer testing cancellation workflow",
            "cancelled_by": "buyer1",
            "role": "buyer"
        }, headers=b_headers)
        assert cancel_res.status_code == 200, f"Cancel order failed: {cancel_res.text}"
        cancel_data = cancel_res.json()
        print(f"Cancel response: {cancel_data}")
        assert cancel_data["status"] == "cancelled"
        assert cancel_data["restored_quantity"] == 100.0

        print("--- Step 8: Verify farmer inventory restored: 200 kg -> 300 kg ---")
        all_h_after = await client.get("/api/harvests")
        h_after = next(h for h in all_h_after.json() if h["id"] == harvest_id)
        print(f"Harvest after cancellation: Total={h_after['estimated_quantity']}, Reserved={h_after.get('reserved_quantity')}, Available={h_after.get('available_quantity')}")
        assert h_after.get("available_quantity") == 300.0, f"Expected 300.0 available, got {h_after.get('available_quantity')}"
        assert h_after.get("reserved_quantity") == 0.0, f"Expected 0.0 reserved, got {h_after.get('reserved_quantity')}"

        print("--- Step 9: Verify Admin History audit entry ---")
        audit_res = await client.get("/api/admin/cancellations")
        assert audit_res.status_code == 200
        audits = audit_res.json()
        matching_audit = next((a for a in audits if a.get("order_id") == order_id), None)
        assert matching_audit is not None, "Audit record for cancelled order was not found in Admin History!"
        print(f"Found audit record: {matching_audit}")
        assert matching_audit["restored_quantity"] == 100.0
        assert matching_audit["crop"] == "Tomato"
        assert matching_audit["quality_grade"] == "A"
        assert matching_audit["cancelled_status"] == "cancelled"

        print("--- Step 10: Verify cannot cancel already picked_up order rule ---")
        # Create another test order and mark picked up
        h2 = await client.post("/api/harvests", json={
            "farmer_id": 1, "crop": "Tomato", "estimated_quantity": 100.0,
            "quality_grade": "B", "harvest_date": "2026-10-02",
            "available_date": "2026-10-02", "location": "Kolar", "status": "estimated"
        }, headers=f_headers)
        h2_id = h2.json()["id"]
        req2 = await client.post("/api/buyer-requests", json={
            "buyer_id": 1, "harvest_id": h2_id, "quantity": 50.0,
            "quality_grade": "B", "delivery_date": "2026-10-03"
        }, headers=b_headers)
        o2_id = req2.json()["order_id"]
        await client.post(f"/api/orders/{o2_id}/accept", headers=f_headers)
        # Transporter marks picked_up
        await client.post(f"/api/transport/orders/{o2_id}/update-status", json={"status": "picked_up"})
        # Try cancelling: should fail with 400
        illegal_cancel = await client.post(f"/api/orders/{o2_id}/cancel", json={
            "reason": "Too late cancel", "cancelled_by": "buyer1"
        })
        assert illegal_cancel.status_code == 400, f"Expected 400 error for picked_up cancellation, got {illegal_cancel.status_code}"
        print(f"Correctly rejected cancellation after pickup: {illegal_cancel.json()['detail']}")

        print("\n[SUCCESS] ALL CANCELLATION & INVENTORY RESTORATION TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    asyncio.run(test_cancellation())
