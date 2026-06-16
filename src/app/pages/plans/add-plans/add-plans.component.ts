import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router'; // 🌟 นำเข้า ActivatedRoute
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-add-plans',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './add-plans.component.html',
  styleUrl: './add-plans.component.css'
})
export class AddPlansComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute); // 🌟 ใช้รับค่า

  // 🌟 ตัวแปรโหมดแก้ไข
  isEditMode = signal(false);
  editId: string | null = null;

  // ฟิลด์ข้อมูลหลัก
  projectName = '';
  approvedBudget: number | null = null;
  usedBudget: number | null = null;
  details = '';

  subActivities = signal([{ id: 1, value: '' }]);
  nextSubId = 2;

  participants = [{ staff_id: '' }]; 
  staffMembers = signal<any[]>([]);
  userScope = signal<string>('none');
  loading = false;

  strategiesList = signal(['1. Future Research and Innovation', '2. Future Education', '3. Future Lecturer/Researcher', '4. Future System for Management', '5. Sustainable Future', '6. บริการวิชาการและบริการชุมชน', '7. การทำนุบำรุงศิลปะและวัฒนธรรมฯ']);
  plansList = signal(['แผนงาน1', 'แผนงาน2', 'แผนงาน3', 'แผนงาน4', 'แผนงาน5']);
  statusList = ['อยู่ระหว่างดำเนินการ', 'ยังไม่ได้ดำเนินการ', 'เสร็จสิ้น'];

  isStrategyOpen = signal(false);
  selectedStrategy = signal('เลือกแผนยุทธศาสตร์');
  isAddingStrategy = signal(false);
  editingStrategyIndex = signal<number | null>(null);

  isPlanOpen = signal(false);
  selectedPlan = signal('เลือกแผนงาน');
  isAddingPlan = signal(false);
  editingPlanIndex = signal<number | null>(null);

  isStatusOpen = signal(false);
  selectedStatus = signal('ระบุสถานะ');

  ngOnInit() { 
    this.loadStaff(); 

    // 🌟 ดักจับข้อมูล Edit Mode จากตาราง
    this.route.queryParams.subscribe(params => {
      if (params['edit']) {
        this.isEditMode.set(true);
        this.editId = params['edit'];
        
        const state = history.state;
        if (state && state.planData) {
          const data = state.planData;
          
          // โหลดข้อมูลเก่าลงฟอร์ม
          this.projectName = data.projectName || '';
          this.approvedBudget = data.approvedBudget ? Number(data.approvedBudget) : null;
          this.usedBudget = data.usedBudget ? Number(data.usedBudget) : null;
          this.details = data.details || '';
          
          // โหลดสถานะและยุทธศาสตร์
          if (data.status && data.status !== '-') this.selectedStatus.set(data.status);
          if (data.strategy && data.strategy !== '-') {
            this.selectedStrategy.set(data.strategy);
            // เพิ่มเข้า List หากไม่มีอยู่ใน List เริ่มต้น
            if (!this.strategiesList().includes(data.strategy)) {
              this.strategiesList.update(list => [...list, data.strategy]);
            }
          }
          if (data.planType && data.planType !== '-') {
            this.selectedPlan.set(data.planType);
            // เพิ่มเข้า List หากไม่มีอยู่ใน List เริ่มต้น
            if (!this.plansList().includes(data.planType)) {
              this.plansList.update(list => [...list, data.planType]);
            }
          }

          // แปลงข้อความ subActivity กลับเป็น Object 
          if (data.subActivity && data.subActivity !== '-') {
            const subs = data.subActivity.split(',').map((s: string) => s.trim());
            const subArray = subs.map((val: string, index: number) => ({
              id: index + 1,
              value: val
            }));
            this.subActivities.set(subArray);
            this.nextSubId = subArray.length + 1;
          }

          // โหลดข้อมูลผู้รับผิดชอบ (จำลองถ้าส่งมาเป็น Array)
          if (data.participants_list && Array.isArray(data.participants_list) && data.participants_list.length > 0) {
            this.participants = data.participants_list;
          }
        }
      }
    });
  }

  loadStaff() {
    const headers = new HttpHeaders().set('X-User-Id', localStorage.getItem('user_id') || '14');
    this.http.get<any>('http://localhost:8080/api/add_plan.php', { headers }).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.userScope.set(res.scope);
          this.staffMembers.set(res.staff_list || []);
          
          // ล็อคชื่อถ้าไม่ได้อยู่ในโหมดแก้แล้วมีชื่ออยู่แล้ว
          if (res.scope === 'self' && res.staff_list.length > 0) {
            if (this.participants.length > 0 && !this.participants[0].staff_id) {
              this.participants[0].staff_id = res.staff_list[0].staff_id.toString();
            }
          }
        }
      }
    });
  }

  // --- Functions ของ UI ยุทธศาสตร์/แผนงาน คงไว้เหมือนเดิม 100% ---
  addSubActivity() { this.subActivities.update(list => [...list, { id: this.nextSubId++, value: '' }]); }
  removeSubActivity(id: number) { this.subActivities.update(list => list.filter(item => item.id !== id)); }
  updateSubActivity(id: number, newValue: string) { this.subActivities.update(list => list.map(item => item.id === id ? { ...item, value: newValue } : item)); }
  addParticipant() { this.participants.push({ staff_id: '' }); }
  removeParticipant(index: number) { if (this.participants.length > 1) this.participants.splice(index, 1); }
  
  toggleStrategy() { this.isStrategyOpen.set(!this.isStrategyOpen()); this.isPlanOpen.set(false); this.isStatusOpen.set(false); }
  selectStrategy(strategy: string) { this.selectedStrategy.set(strategy); this.isStrategyOpen.set(false); }
  addNewStrategy(value: string) { if (value.trim()) { this.strategiesList.update(list => [...list, value.trim()]); this.selectedStrategy.set(value.trim()); this.isAddingStrategy.set(false); } }
  startEditStrategy(index: number, event: Event) { event.stopPropagation(); this.editingStrategyIndex.set(index); this.isAddingStrategy.set(false); }
  saveEditStrategy(index: number, newValue: string, event: Event) { event.stopPropagation(); if (newValue.trim()) { this.strategiesList.update(list => { const newList = [...list]; if (this.selectedStrategy() === newList[index]) this.selectedStrategy.set(newValue.trim()); newList[index] = newValue.trim(); return newList; }); } this.editingStrategyIndex.set(null); }
  cancelEditStrategy(event: Event) { event.stopPropagation(); this.editingStrategyIndex.set(null); }
  deleteStrategy(index: number, event: Event) { event.stopPropagation(); const itemToDelete = this.strategiesList()[index]; this.strategiesList.update(list => list.filter((_, i) => i !== index)); if (this.selectedStrategy() === itemToDelete) this.selectedStrategy.set('เลือกแผนยุทธศาสตร์'); this.editingStrategyIndex.set(null); }

  togglePlan() { this.isPlanOpen.set(!this.isPlanOpen()); this.isStrategyOpen.set(false); this.isStatusOpen.set(false); }
  selectPlan(plan: string) { this.selectedPlan.set(plan); this.isPlanOpen.set(false); }
  addNewPlan(value: string) { if (value.trim()) { this.plansList.update(list => [...list, value.trim()]); this.selectedPlan.set(value.trim()); this.isAddingPlan.set(false); } }
  startEditPlan(index: number, event: Event) { event.stopPropagation(); this.editingPlanIndex.set(index); this.isAddingPlan.set(false); }
  saveEditPlan(index: number, newValue: string, event: Event) { event.stopPropagation(); if (newValue.trim()) { this.plansList.update(list => { const newList = [...list]; if (this.selectedPlan() === newList[index]) this.selectedPlan.set(newValue.trim()); newList[index] = newValue.trim(); return newList; }); } this.editingPlanIndex.set(null); }
  cancelEditPlan(event: Event) { event.stopPropagation(); this.editingPlanIndex.set(null); }
  deletePlan(index: number, event: Event) { event.stopPropagation(); const itemToDelete = this.plansList()[index]; this.plansList.update(list => list.filter((_, i) => i !== index)); if (this.selectedPlan() === itemToDelete) this.selectedPlan.set('เลือกแผนงาน'); this.editingPlanIndex.set(null); }

  toggleStatus() { this.isStatusOpen.set(!this.isStatusOpen()); this.isStrategyOpen.set(false); this.isPlanOpen.set(false); }
  selectStatus(status: string) { this.selectedStatus.set(status); this.isStatusOpen.set(false); }

  // --- ระบบบันทึกข้อมูลเข้า API ---
  submitForm() {
    if (!this.projectName.trim()) { alert('กรุณาตั้งชื่อโครงการด้วยครับ'); return; }
    if (this.participants.some(p => !p.staff_id)) { alert('กรุณาเลือกรหัสผู้รับผิดชอบให้ครบในช่องที่เพิ่มไว้ครับ'); return; }

    this.loading = true;
    
    // 🌟 ส่ง ID ไปให้ API เพื่ออัปเดตข้อมูล
    const payload = {
      id: this.editId,
      plan_name: this.projectName,
      strategy: this.selectedStrategy() === 'เลือกแผนยุทธศาสตร์' ? '' : this.selectedStrategy(),
      plan_type: this.selectedPlan() === 'เลือกแผนงาน' ? '' : this.selectedPlan(),
      approved_budget: this.approvedBudget,
      used_budget: this.usedBudget,
      status: this.selectedStatus() === 'ระบุสถานะ' ? '' : this.selectedStatus(),
      details: this.selectedStatus() === 'อยู่ระหว่างดำเนินการ' ? this.details : '',
      subActivities: this.subActivities(),
      participants: this.participants
    };

    const headers = new HttpHeaders().set('X-User-Id', localStorage.getItem('user_id') || '14');
    
    // 🌟 สลับ API ยิงไป Update ถ้าเป็นโหมดแก้ไข
    const apiUrl = this.isEditMode() 
      ? 'http://localhost:8080/api/update_plan.php' // ต้องให้เพื่อนทำไฟล์เพิ่ม
      : 'http://localhost:8080/api/add_plan.php';

    this.http.post<any>(apiUrl, payload, { headers })
      .subscribe({
        next: (res) => {
          this.loading = false;
          if (res.success) {
            alert('✅ ' + (this.isEditMode() ? 'อัปเดตข้อมูลสำเร็จ' : 'บันทึกสำเร็จ'));
            this.router.navigate(['/plans']);
          } else { alert('❌ ' + res.message); }
        },
        error: () => { this.loading = false; alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'); }
      });
  }
}