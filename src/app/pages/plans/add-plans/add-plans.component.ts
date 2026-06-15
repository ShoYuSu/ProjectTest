import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
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

  // ฟิลด์ข้อมูลตรงกับ UI ของคุณ
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

  ngOnInit() { this.loadStaff(); }

  loadStaff() {
    const headers = new HttpHeaders().set('X-User-Id', localStorage.getItem('user_id') || '14');
    this.http.get<any>('http://localhost:8080/api/add_plan.php', { headers }).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.userScope.set(res.scope);
          this.staffMembers.set(res.staff_list || []);
          if (res.scope === 'self' && res.staff_list.length > 0) {
            this.participants[0].staff_id = res.staff_list[0].staff_id.toString();
          }
        }
      }
    });
  }

  // --- Functions ของ UI ยุทธศาสตร์/แผนงาน คงไว้เหมือนเดิมของคุณ 100% ---
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
    const payload = {
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
    this.http.post<any>('http://localhost:8080/api/add_plan.php', payload, { headers })
      .subscribe({
        next: (res) => {
          this.loading = false;
          if (res.success) {
            alert('✅ ' + res.message);
            this.router.navigate(['/plans']);
          } else { alert('❌ ' + res.message); }
        },
        error: () => { this.loading = false; alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'); }
      });
  }
}