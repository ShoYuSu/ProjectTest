import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router'; 
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
  private router = inject(Router);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute); 

  isEditMode = signal(false);
  editId: string | null = null;
  loading = false;

  // 🌟 แมปตัวแปรหลักให้ตรงกับ HTML
  projectName = '';
  approvedBudget: number | null = null;
  usedBudget: number | null = null;
  details = '';

  // 🌟 ตัวแปรรายชื่อผู้รับผิดชอบ
  participants = [{ staff_id: '' }]; 
  staffMembers = signal<any[]>([]);
  userScope = signal<string>('none'); 

  // 🌟 ตัวแปรและฟังก์ชัน กิจกรรมย่อย (Sub Activities)
  subActivities = signal<{id: number, value: string}[]>([{ id: Date.now(), value: '' }]);

  // 🌟 ตัวแปร ยุทธศาสตร์ (Strategy Dropdown)
  isStrategyOpen = signal(false);
  selectedStrategy = signal('เลือกแผนยุทธศาสตร์');
  strategiesList = signal([
    '1. Future Research and Innovation',
    '2. Future Education',
    '3. Future Society',
    '4. Future System for Management',
    '5. บริหารจัดการ',
    '6. บริการวิชาการและบริการชุมชน',
    '7. ทำนุบำรุงศิลปวัฒนธรรม'
  ]);
  editingStrategyIndex = signal<number | null>(null);
  isAddingStrategy = signal(false);

  // 🌟 ตัวแปร ประเภทแผนงาน (Plan Dropdown)
  isPlanOpen = signal(false);
  selectedPlan = signal('เลือกแผนงาน');
  plansList = signal(['แผนงาน1', 'แผนงาน2', 'แผนงาน3', 'แผนงาน4', 'แผนงาน5']);
  editingPlanIndex = signal<number | null>(null);
  isAddingPlan = signal(false);

  // 🌟 ตัวแปร สถานะ (Status Dropdown)
  isStatusOpen = signal(false);
  selectedStatus = signal('ยังไม่ได้ดำเนินการ');
  statusList = ['ยังไม่ได้ดำเนินการ', 'อยู่ระหว่างดำเนินการ', 'เสร็จสิ้น'];

  ngOnInit() {
    this.loadActiveStaff();

    this.route.queryParams.subscribe(params => {
      if (params['edit']) {
        this.isEditMode.set(true);
        this.editId = params['edit'];
        
        const state = history.state;
        if (state && state.planData) {
          const data = state.planData;
          
          // โหลดข้อมูลเก่ามาแสดงบนฟอร์ม
          this.projectName = data.plan_name || '';
          this.selectedStrategy.set(data.strategy || 'เลือกแผนยุทธศาสตร์');
          this.selectedPlan.set(data.plan_type || 'เลือกแผนงาน');
          this.approvedBudget = data.approved_budget ? Number(data.approved_budget) : null;
          this.usedBudget = data.used_budget ? Number(data.used_budget) : null;
          this.selectedStatus.set(data.status || 'ยังไม่ได้ดำเนินการ');
          this.details = data.details || '';

          // นำเข้า Sub Activities จาก Backend (ถ้ามี)
          // สมมติว่า Backend ส่งกลับมาในฟิลด์ที่ชื่อว่า sub_activities_list
          if (data.sub_activities_list && Array.isArray(data.sub_activities_list) && data.sub_activities_list.length > 0) {
            const mappedActs = data.sub_activities_list.map((act: any) => ({ id: Math.random(), value: act.activity_name }));
            this.subActivities.set(mappedActs);
          }

          // นำเข้า Participants
          if (data.participants_list && Array.isArray(data.participants_list) && data.participants_list.length > 0) {
            this.participants = data.participants_list;
          }
        }
      }
    });
  }

  loadActiveStaff() {
    const currentUserId = localStorage.getItem('user_id') || '0';
    const headers = new HttpHeaders().set('X-User-Id', currentUserId);
    
    this.http.get<any>('http://localhost:8080/api/add_plan.php', { headers })
      .subscribe({
        next: (res) => {
          if (res && res.success) {
            this.userScope.set(res.scope);
            this.staffMembers.set(res.staff_list || []);
            
            if (res.scope === 'self' && res.staff_list.length > 0) {
              if (this.participants.length > 0 && !this.participants[0].staff_id) {
                 this.participants[0].staff_id = res.staff_list[0].staff_id.toString();
              }
            }
          }
        }
      });
  }

  // --- ฟังก์ชันจัดการ ผู้รับผิดชอบ ---
  addParticipant() { this.participants.push({ staff_id: '' }); }
  removeParticipant(index: number) { if (this.participants.length > 1) this.participants.splice(index, 1); }

  // --- ฟังก์ชันจัดการ กิจกรรมย่อย ---
  addSubActivity() { this.subActivities.update(acts => [...acts, { id: Date.now(), value: '' }]); }
  removeSubActivity(id: number) { this.subActivities.update(acts => acts.filter(a => a.id !== id)); }
  updateSubActivity(id: number, val: string) { 
    this.subActivities.update(acts => acts.map(a => a.id === id ? { ...a, value: val } : a)); 
  }

  // --- ฟังก์ชันจัดการ Dropdown ยุทธศาสตร์ ---
  toggleStrategy() { this.isStrategyOpen.set(!this.isStrategyOpen()); }
  selectStrategy(item: string) { this.selectedStrategy.set(item); this.isStrategyOpen.set(false); }
  startEditStrategy(index: number, event: Event) { event.stopPropagation(); this.editingStrategyIndex.set(index); }
  saveEditStrategy(index: number, val: string, event: Event) {
    event.stopPropagation();
    if(val.trim()) {
      const list = this.strategiesList();
      if(this.selectedStrategy() === list[index]) this.selectedStrategy.set(val.trim());
      list[index] = val.trim();
      this.strategiesList.set([...list]);
    }
    this.editingStrategyIndex.set(null);
  }
  cancelEditStrategy(event: Event) { event.stopPropagation(); this.editingStrategyIndex.set(null); }
  deleteStrategy(index: number, event: Event) {
    event.stopPropagation();
    if(confirm('ยืนยันการลบยุทธศาสตร์นี้?')) {
      const list = this.strategiesList();
      if(this.selectedStrategy() === list[index]) this.selectedStrategy.set('เลือกแผนยุทธศาสตร์');
      list.splice(index, 1);
      this.strategiesList.set([...list]);
    }
  }
  addNewStrategy(val: string) {
    if(val.trim()) {
      this.strategiesList.update(l => [...l, val.trim()]);
      this.selectedStrategy.set(val.trim());
      this.isAddingStrategy.set(false);
    }
  }

  // --- ฟังก์ชันจัดการ Dropdown แผนงาน ---
  togglePlan() { this.isPlanOpen.set(!this.isPlanOpen()); }
  selectPlan(item: string) { this.selectedPlan.set(item); this.isPlanOpen.set(false); }
  startEditPlan(index: number, event: Event) { event.stopPropagation(); this.editingPlanIndex.set(index); }
  saveEditPlan(index: number, val: string, event: Event) {
    event.stopPropagation();
    if(val.trim()) {
      const list = this.plansList();
      if(this.selectedPlan() === list[index]) this.selectedPlan.set(val.trim());
      list[index] = val.trim();
      this.plansList.set([...list]);
    }
    this.editingPlanIndex.set(null);
  }
  cancelEditPlan(event: Event) { event.stopPropagation(); this.editingPlanIndex.set(null); }
  deletePlan(index: number, event: Event) {
    event.stopPropagation();
    if(confirm('ยืนยันการลบแผนงานนี้?')) {
      const list = this.plansList();
      if(this.selectedPlan() === list[index]) this.selectedPlan.set('เลือกแผนงาน');
      list.splice(index, 1);
      this.plansList.set([...list]);
    }
  }
  addNewPlan(val: string) {
    if(val.trim()) {
      this.plansList.update(l => [...l, val.trim()]);
      this.selectedPlan.set(val.trim());
      this.isAddingPlan.set(false);
    }
  }

  // --- ฟังก์ชันจัดการ Dropdown สถานะ ---
  toggleStatus() { this.isStatusOpen.set(!this.isStatusOpen()); }
  selectStatus(item: string) { this.selectedStatus.set(item); this.isStatusOpen.set(false); }

  // --- ฟังก์ชันกดบันทึกข้อมูล ---
  submitForm() {
    if (!this.projectName.trim()) {
      alert('กรุณากรอกชื่อโครงการให้ครบถ้วน');
      return;
    }

    if (this.participants.some(p => !p.staff_id)) {
      alert('กรุณาเลือกรายชื่อผู้รับผิดชอบโครงการในช่องว่างให้ครบ');
      return;
    }

    if (this.selectedStatus() === 'อยู่ระหว่างดำเนินการ' && !this.details.trim()) {
      alert('กรุณาระบุรายละเอียดความคืบหน้า');
      return;
    }

    this.loading = true;
    const currentUserId = localStorage.getItem('user_id') || '0';
    const headers = new HttpHeaders().set('X-User-Id', currentUserId);

    // 🌟 แมปตัวแปรทั้งหมดจากหน้า UI เพื่อส่งกลับไปให้ PHP
    const payload = {
      id: this.editId,
      plan_name: this.projectName,
      strategy: this.selectedStrategy() === 'เลือกแผนยุทธศาสตร์' ? '' : this.selectedStrategy(),
      plan_type: this.selectedPlan() === 'เลือกแผนงาน' ? '' : this.selectedPlan(),
      approved_budget: this.approvedBudget,
      used_budget: this.usedBudget,
      status: this.selectedStatus() === 'ระบุสถานะ' ? 'ยังไม่ได้ดำเนินการ' : this.selectedStatus(),
      details: this.details,
      participants: this.participants,
      // แปลงข้อมูล Signal กลับเป็น Array { activity_name: '...' } ให้ PHP อ่านง่ายๆ
      sub_activities: this.subActivities().filter(a => a.value.trim() !== '').map(a => ({ activity_name: a.value }))
    };
    
    const apiUrl = this.isEditMode() 
      ? 'http://localhost:8080/api/update_plan.php' 
      : 'http://localhost:8080/api/add_plan.php';

    this.http.post<any>(apiUrl, payload, { headers })
      .subscribe({
        next: (res) => {
          if (res && res.success) {
            alert('✅ บันทึกข้อมูลแผนงานสำเร็จ!');
            this.router.navigate(['/plans']); 
          } else {
            alert('❌ ' + res.message);
          }
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          const errorDetail = err.error?.error || err.message || JSON.stringify(err.error);
          alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: ' + errorDetail);
          this.loading = false;
        }
      });
  }
}