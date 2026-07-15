import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router'; 
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin } from 'rxjs';

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

  projectName = '';
  approvedBudget: number | null = null;
  usedBudget: number | null = null;
  details = '';
  
  // 🌟 เพิ่มตัวแปรสำหรับจัดการไฟล์แนบ
  attachedFile = ''; 
  selectedFileName = signal<string>('');

  participants: Array<{ staff_id: string }> = [{ staff_id: '' }]; 
  staffMembers = signal<any[]>([]);
  userScope = signal<string>('none'); 
  currentStaffId = signal<string>(''); 

  subActivities = signal<{id: number, value: string}[]>([{ id: Date.now(), value: '' }]);

  selectedStrategy = signal<string>('เลือกแผนยุทธศาสตร์');
  strategies = ['แผนยุทธศาสตร์ที่ 1: ผลิตบัณฑิตที่มีคุณภาพ', 'แผนยุทธศาสตร์ที่ 2: งานวิจัยและนวัตกรรม', 'แผนยุทธศาสตร์ที่ 3: บริการวิชาการ', 'แผนยุทธศาสตร์ที่ 4: บริหารจัดการองค์กร'];
  isStrategyOpen = signal(false);

  selectedPlan = signal<string>('เลือกแผนงาน');
  planTypes = ['แผนงานระดับคณะ', 'แผนงานระดับภาควิชา', 'โครงการพิเศษ', 'แผนงานบูรณาการ'];
  isPlanOpen = signal(false);

  selectedStatus = signal<string>('ระบุสถานะ');
  statusList = ['ยังไม่ได้ดำเนินการ', 'อยู่ระหว่างดำเนินการ', 'ดำเนินการแล้วเสร็จ'];
  isStatusOpen = signal(false);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['edit']) {
        this.isEditMode.set(true);
        this.editId = params['edit'];
      }
      this.loadActiveStaff();
    });
  }

  loadActiveStaff() {
    this.loading = true;
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    let setupUrl = 'http://localhost:8080/api/add_plan.php';
    if (this.isEditMode() && this.editId) {
      setupUrl += `?id=${this.editId}`;
    }

    forkJoin({
      profile: this.http.get<any>('http://localhost:8080/api/get_staff_profile.php', { headers }),
      perms: this.http.get<any>('http://localhost:8080/api/get_permissions.php', { headers }),
      setupData: this.http.get<any>(setupUrl, { headers })
    }).subscribe({
      next: (res) => {
        const mappedStaff = (res.setupData.staff_list || []).map((s: any) => ({
          staff_id: s.staff_id,
          full_name: s.full_name,
          position: s.position
        }));
        this.staffMembers.set(mappedStaff);

        let myStaffId = '';
        if (res.profile && res.profile.status === 'success') {
          myStaffId = res.profile.data.basic_info.staff_id?.toString() || '';
          this.currentStaffId.set(myStaffId); 
        }

        let scope = 'none';
        const p = res.perms.permissions || res.perms || {};
        const targetModules = ['plan_project', 'plan_info', 'plan']; 
        
        for (const mod of targetModules) {
          if (p[mod]) {
             const targetAction = this.isEditMode() ? 'edit' : 'add';
             if (p[mod][targetAction]) {
                scope = p[mod][targetAction].toString().toLowerCase().trim();
                break;
             }
          }
        }
        this.userScope.set(scope);

        if (this.isEditMode() && res.setupData.plan_data) {
          const pd = res.setupData.plan_data;
          this.projectName = pd.plan_name || '';
          this.selectedStrategy.set(pd.strategy || 'เลือกแผนยุทธศาสตร์');
          this.selectedPlan.set(pd.plan_type || 'เลือกแผนงาน');
          this.approvedBudget = pd.approved_budget ? Number(pd.approved_budget) : null;
          this.usedBudget = pd.used_budget ? Number(pd.used_budget) : null;
          this.selectedStatus.set(pd.status || 'ระบุสถานะ');
          this.details = pd.details || '';

          // 🌟 ตั้งค่าลิงก์ไฟล์แนบเดิม
          if (pd.attached_file) {
            this.attachedFile = "http://localhost:8080/api/" + pd.attached_file;
          }
          
          if (pd.participants && pd.participants.length > 0) {
            this.participants = pd.participants;
          }
          if (pd.sub_activities && pd.sub_activities.length > 0) {
            this.subActivities.set(
              pd.sub_activities.map((a: any, i: number) => ({ id: Date.now() + i, value: a.activity_name }))
            );
          }
        }

        if (this.participants.length === 1 && !this.participants[0].staff_id) {
          if (scope === 'self' && myStaffId) {
             this.participants[0].staff_id = myStaffId; 
          }
        }

        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        alert('❌ ไม่สามารถดึงข้อมูลพื้นฐานได้');
        this.loading = false;
      }
    });
  }

  // 🌟 จัดการอัปโหลดไฟล์เป็น Base64
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5242880) {
        alert('❌ ขนาดไฟล์ใหญ่เกินไป! กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5 MB ครับ');
        event.target.value = ''; 
        return;
      }
      this.selectedFileName.set(file.name);
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.attachedFile = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  toggleStrategy() { this.isStrategyOpen.set(!this.isStrategyOpen()); this.isPlanOpen.set(false); this.isStatusOpen.set(false); }
  selectStrategy(item: string) { this.selectedStrategy.set(item); this.isStrategyOpen.set(false); }
  togglePlan() { this.isPlanOpen.set(!this.isPlanOpen()); this.isStrategyOpen.set(false); this.isStatusOpen.set(false); }
  selectPlan(item: string) { this.selectedPlan.set(item); this.isPlanOpen.set(false); }
  toggleStatus() { this.isStatusOpen.set(!this.isStatusOpen()); this.isStrategyOpen.set(false); this.isPlanOpen.set(false); }
  selectStatus(item: string) { this.selectedStatus.set(item); this.isStatusOpen.set(false); }

  addParticipant() { this.participants.push({ staff_id: '' }); }
  removeParticipant(index: number) { if (this.participants.length > 1) { this.participants.splice(index, 1); } }

  addSubActivity() { this.subActivities.update(items => [...items, { id: Date.now(), value: '' }]); }
  removeSubActivity(id: number) { this.subActivities.update(items => items.filter(item => item.id !== id)); }
  updateSubActivity(id: number, newValue: string) { this.subActivities.update(items => items.map(item => item.id === id ? { ...item, value: newValue } : item)); }

  submitForm() {
    if (!this.projectName.trim()) { alert('กรุณาระบุชื่อโครงการ'); return; }
    if (this.participants.some(p => !p.staff_id)) { alert('กรุณาเลือกชื่อผู้รับผิดชอบให้ครบถ้วน'); return; }

    if (this.userScope() === 'self' && this.currentStaffId()) {
      const hasSelf = this.participants.some(p => p.staff_id.toString() === this.currentStaffId().toString());
      if (!hasSelf) {
        alert('❌ ในฐานะผู้ใช้งานทั่วไป คุณจำเป็นต้องระบุชื่อตนเองเป็นผู้รับผิดชอบโครงการด้วยครับ');
        return;
      }
    }

    this.loading = true;
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const payload = {
      id: this.editId,
      plan_name: this.projectName,
      strategy: this.selectedStrategy() === 'เลือกแผนยุทธศาสตร์' ? '' : this.selectedStrategy(),
      plan_type: this.selectedPlan() === 'เลือกแผนงาน' ? '' : this.selectedPlan(),
      approved_budget: this.approvedBudget,
      used_budget: this.usedBudget,
      status: this.selectedStatus() === 'ระบุสถานะ' ? 'ยังไม่ได้ดำเนินการ' : this.selectedStatus(),
      details: this.details,
      attached_file: this.attachedFile, // 🌟 แนบไฟล์ส่งไปให้ API
      participants: this.participants,
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
          alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
          this.loading = false;
        }
      });
  }
}