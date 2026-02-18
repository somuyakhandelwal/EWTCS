# US-6.1 Manual Testing Guide

## 🎯 Quick Start Guide for Testing

**Time Required:** 15-20 minutes  
**Prerequisites:** Development server running, admin credentials

---

## Setup

1. **Start the server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Open browser**: Navigate to `http://localhost:3000` (or port shown in terminal)

3. **Login as admin**:
   - Username: `admin1`
   - Password: `Nurse@123`

---

## Test Sequence (Follow in Order)

### ✅ Test 1: Access Bed Management (2 minutes)

1. After login, you should be on the Admin Dashboard
2. Look for the "Quick Actions" section
3. **VERIFY:** "Manage Beds" card with bed icon exists
4. Click "Manage Beds"
5. **VERIFY:** Page loads showing bed management table
6. **VERIFY:** Column headers: Bed Number, Ward, Location, Status, Current Stage, Occupied, Actions

**Expected Result:** ✅ Page loads without errors, table displays existing beds

---

### ✅ Test 2: Create a New Bed (3 minutes)

1. Click the "Add New Bed" button (top right)
2. **VERIFY:** Dialog opens with form

3. **Test Valid Creation:**
   - Bed Number: `TEST-001`
   - Ward: Select any ward from dropdown
   - Location: `Test Room 101`
   - Click "Create Bed"
   
4. **VERIFY:**
   - ✅ Dialog closes
   - ✅ New bed appears in table
   - ✅ Shows "Active" badge (green)
   - ✅ Shows "Empty" stage
   - ✅ Shows "Available" occupancy
   - ✅ Statistics update (Active count increases)

5. **Test Duplicate Prevention:**
   - Click "Add New Bed" again
   - Enter same bed number: `TEST-001`
   - Click "Create Bed"
   - **VERIFY:** Error message "Bed number 'TEST-001' already exists"

6. **Test Invalid Format:**
   - Try bed number: `TEST@001` (with special char)
   - **VERIFY:** Browser validation prevents submission or shows error

**Expected Result:** ✅ Valid bed created, duplicates prevented, invalid formats rejected

---

### ✅ Test 3: Edit Existing Bed (3 minutes)

1. Find the bed you just created (`TEST-001`)
2. Click the **Edit icon** (pencil icon) in Actions column
3. **VERIFY:** Dialog opens with pre-filled data

4. **Test Edit:**
   - Change bed number to: `TEST-002`
   - Change location to: `Test Room 202`
   - Click "Update Bed"

5. **VERIFY:**
   - ✅ Dialog closes
   - ✅ Bed number updated in table
   - ✅ Location updated in table
   - ✅ No page refresh needed

6. **Test Duplicate Prevention (Edit):**
   - Edit `TEST-002` again
   - Try to change to existing bed number (e.g., if you have `ER-01`, try that)
   - **VERIFY:** Error message about duplicate

**Expected Result:** ✅ Bed updates successfully, duplicates prevented

---

### ✅ Test 4: Search and Filter (2 minutes)

1. In the search box, type: `TEST`
2. **VERIFY:** Only beds with "TEST" in name/location shown

3. Clear search and type: `Room`
4. **VERIFY:** Beds with "Room" in location shown

5. Clear search

6. Click "Show All" button
7. **VERIFY:** Button text changes to "Show Active Only"
8. **VERIFY:** Any inactive beds appear

9. Click "Show Active Only"
10. **VERIFY:** Only active beds shown

**Expected Result:** ✅ Search filters correctly, toggle shows/hides inactive beds

---

### ✅ Test 5: Deactivate Bed (3 minutes)

1. Find your test bed (`TEST-002`)
2. **VERIFY:** Bed shows "Available" (not occupied)

3. Click the **Deactivate icon** (power-off icon with red color)
4. **VERIFY:** Confirmation dialog appears
5. **VERIFY:** Warning message explains impact
6. Click "Deactivate"

7. **VERIFY:**
   - ✅ Dialog closes
   - ✅ Bed status changes to "Inactive" badge (red)
   - ✅ Edit button becomes disabled
   - ✅ Deactivate icon changes to Reactivate icon (green)
   - ✅ Statistics update (Active count decreases, Inactive count increases)

8. Click "Show Active Only"
9. **VERIFY:** Deactivated bed is hidden

**Expected Result:** ✅ Bed deactivated successfully, UI updates correctly

---

### ✅ Test 6: Reactivate Bed (2 minutes)

1. Click "Show All" to see inactive beds
2. Find your test bed (`TEST-002`)
3. Click the **Reactivate icon** (green power icon)
4. **VERIFY:** Confirmation dialog appears
5. Click "Reactivate"

6. **VERIFY:**
   - ✅ Dialog closes
   - ✅ Bed status changes back to "Active"
   - ✅ Edit button becomes enabled
   - ✅ Statistics update

**Expected Result:** ✅ Bed reactivated successfully

---

### ✅ Test 7: Prevent Deactivating Occupied Bed (2 minutes)

**Note:** This test requires a bed to be marked as occupied. If you have access to the database or another admin function:

1. Find a bed marked as "Occupied"
2. Try to click the Deactivate button
3. **VERIFY:** Button might be disabled OR
4. If clickable, confirmation should show error
5. **Expected:** Error message "Cannot deactivate an occupied bed"

**If no occupied beds available:** ⚠️ Skip this test or manually set a bed to occupied in database

---

### ✅ Test 8: Dashboard Integration (2 minutes)

1. Open a new browser tab
2. Navigate to `http://localhost:3000/dashboard` (nurse view)
3. Login as nurse if needed:
   - Username: `nurse`
   - Password: `Nurse@123`

4. **VERIFY:** Bed grid shows beds
5. Check if your test bed (`TEST-002`) is visible

6. Go back to admin tab
7. Deactivate the test bed
8. Refresh the nurse dashboard tab
9. **VERIFY:** Test bed disappears from nurse view

10. Reactivate the bed in admin
11. Refresh nurse dashboard
12. **VERIFY:** Test bed reappears

**Expected Result:** ✅ Changes in admin panel affect nurse dashboard

---

### ✅ Test 9: Error Handling (2 minutes)

1. **Test Required Fields:**
   - Click "Add New Bed"
   - Leave bed number empty
   - Try to submit
   - **VERIFY:** Browser validation shows "required" message

2. **Test Ward Selection:**
   - Leave ward dropdown as "Select ward..."
   - Try to submit
   - **VERIFY:** Validation error

3. **Test Cancel:**
   - Click "Add New Bed"
   - Fill in some data
   - Click "Cancel"
   - **VERIFY:** Dialog closes, no bed created

**Expected Result:** ✅ All validations work, cancel functions correctly

---

### ✅ Test 10: UI/UX (Optional - 3 minutes)

1. **Responsive Design:**
   - Resize browser window to mobile size
   - **VERIFY:** Table scrolls horizontally
   - **VERIFY:** Dialogs fit on screen

2. **Loading States:**
   - Click "Add New Bed" and submit quickly
   - **VERIFY:** "Creating..." text shows briefly
   - **VERIFY:** Button is disabled during submission

3. **Statistics:**
   - Note the statistics (Active/Inactive/Showing counts)
   - Create a bed
   - **VERIFY:** Active count increases
   - Deactivate a bed
   - **VERIFY:** Inactive count increases

**Expected Result:** ✅ UI is responsive and provides feedback

---

## 🐛 Bug Reporting Template

If you find any issues, report them using this template:

```markdown
**Bug Title:** [Brief description]

**Severity:** Critical / High / Medium / Low

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**

**Actual Behavior:**

**Screenshots:** (if applicable)

**Environment:**
- Browser: 
- OS: 
- Node Version: 
```

---

## ✅ Sign Off

After completing all tests:

- [ ] All 10 test scenarios completed
- [ ] No critical bugs found
- [ ] Feature works as expected
- [ ] Ready for code review

**Tester Name:** _______________  
**Date:** _______________  
**Overall Status:** PASS / FAIL  
**Notes:** _______________

---

## 🚀 Next Steps After Testing

1. If all tests pass → Mark feature as Ready for Code Review
2. If bugs found → Create issue tickets and fix
3. Update this document with any additional test scenarios discovered
4. Proceed to staging deployment testing

