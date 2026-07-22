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
  planYear: number = new Date().getFullYear() + 543;
  approvedBudget: number | null = null;
  usedBudget: number | null = null;
  details = '';
  
  // ไฟล์ 2 ส่วน
  proposalFile = ''; 
  selectedProposalName = signal<string>('');
  summaryFile = '';
  selectedSummaryName = signal<string>('');

  participants: Array<{ staff_id: string }> = [{ staff_id: '' }]; 
  staffMembers = signal<any[]>([]);
  userScope = signal<string>('none'); 
  currentStaffId = signal<string>(''); 

  subActivities = signal<{id: number, value: string}[]>([{ id: Date.now(), value: '' }]);

  selectedStrategy = signal<string>('เลือกแผนยุทธศาสตร์');
  strategiesList = signal<string[]>([]);
  isStrategyOpen = signal(false);
  editingStrategyIndex = signal<number | null>(null);
  isAddingStrategy = signal(false);

  selectedPlan = signal<string>('เลือกแผนงาน');
  plansList = signal<string[]>([]);
  isPlanOpen = signal(false);
  editingPlanIndex = signal<number | null>(null);
  isAddingPlan = signal(false);

  selectedStatus = signal<string>('ระบุสถานะ');
  statusList = ['ยังไม่ได้ดำเนินการ', 'อยู่ระหว่างดำเนินการ', 'ดำเนินการแล้วเสร็จ'];
  isStatusOpen = signal(false);

  ngOnInit() {
    this.initDropdownData(); 

    this.route.queryParams.subscribe(params => {
      if (params['edit']) {
        this.isEditMode.set(true);
        this.editId = params['edit'];
      }
      this.loadActiveStaff();
    });
  }

  initDropdownData() {
    const defaultStrategies = [
      'ยุทธศาสตร์ที่ 1 Future Research and Innovation',
      '2. Future Education',
      '3. Future Lecturer /Researcher',
      '4. Future System for Management',
      '5. Sustainable Future',
      '6. บริการวิชาการ และบริการชุมชน',
      '7. การทำนุบำรุงศิลปะและวัฒนธรรมและสร้างจิตสำนึกฯ'
    ];
    const savedStrategies = localStorage.getItem('custom_strategies');
    this.strategiesList.set(savedStrategies ? JSON.parse(savedStrategies) : defaultStrategies);

    const defaultPlans = [
      'แผนงานที่ 1.1 แผนพัฒนาศักยภาพการวิจัย/นวัตกรรม',
      'แผนงานที่ 1.2 ส่งเสริมการตีพิมพ์ผลงานวิจัยและผลงานวิชาการของอาจารย์',
      'แผนงาน 2.1 พัฒนาหลักสูตรเน้นผลลัพธ์การเรียนรู้',
      'แผนงาน 2.2 พัฒนานักศึกษาด้านวิชาการ/วิชาชีพและทักษะด้านดิจิทัลเพื่อสร้างโอกาสการได้งานทำก่อนจบการศึกษา',
      'แผนงานที่ 2.3 แผนพัฒนาและสรรหาสิ่งสนับสนุนการเรียนรู้',
      'แผนงานที่ 3.1 แผนพัฒนาอาจารย์ให้ทันสมัยและเชี่ยวชาญ',
      'แผนงานที่ 4.1 ระบบบริหารจัดการที่คล่องตัวและมีประสิทธิผล',
      'แผนงาน 5.1 พัฒนาคณะวิชาเข้าสู่ชุมชนคาร์บอนต่ำ',
      'แผนงานที่ 6.1 บริการวิชาการเพื่อสร้างสังคมแห่งการเรียนรู้',
      'แผนงานที่ 7.1 ทำนุบำรุงศิลปะและวัฒนธรรมไทย'
    ];
    const savedPlans = localStorage.getItem('custom_plans');
    this.plansList.set(savedPlans ? JSON.parse(savedPlans) : defaultPlans);
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
          this.planYear = pd.plan_year ? Number(pd.plan_year) : new Date().getFullYear() + 543;
          
          if (pd.strategy && !this.strategiesList().includes(pd.strategy)) {
             this.addNewStrategy(pd.strategy);
          }
          if (pd.plan_type && !this.plansList().includes(pd.plan_type)) {
             this.addNewPlan(pd.plan_type);
          }

          this.selectedStrategy.set(pd.strategy || 'เลือกแผนยุทธศาสตร์');
          this.selectedPlan.set(pd.plan_type || 'เลือกแผนงาน');
          this.approvedBudget = pd.approved_budget ? Number(pd.approved_budget) : null;
          this.usedBudget = pd.used_budget ? Number(pd.used_budget) : null;
          this.selectedStatus.set(pd.status || 'ระบุสถานะ');
          this.details = pd.details || '';

          if (pd.proposal_file) {
            this.proposalFile = "http://localhost:8080/api/" + pd.proposal_file;
          }
          if (pd.summary_file) {
            this.summaryFile = "http://localhost:8080/api/" + pd.summary_file;
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

  toggleStrategy() { this.isStrategyOpen.set(!this.isStrategyOpen()); this.isPlanOpen.set(false); this.isStatusOpen.set(false); }
  selectStrategy(item: string) { this.selectedStrategy.set(item); this.isStrategyOpen.set(false); }
  
  startEditStrategy(index: number, event: Event) { event.stopPropagation(); this.editingStrategyIndex.set(index); }
  cancelEditStrategy(event: Event) { event.stopPropagation(); this.editingStrategyIndex.set(null); }
  saveEditStrategy(index: number, val: string, event: Event) {
    event.stopPropagation();
    if (val.trim()) {
      const list = this.strategiesList();
      if (this.selectedStrategy() === list[index]) this.selectedStrategy.set(val.trim());
      list[index] = val.trim();
      this.strategiesList.set([...list]);
      localStorage.setItem('custom_strategies', JSON.stringify(list)); 
    }
    this.editingStrategyIndex.set(null);
  }
  deleteStrategy(index: number, event: Event) {
    event.stopPropagation();
    if (confirm('ยืนยันการลบยุทธศาสตร์นี้?')) {
      const list = this.strategiesList();
      if (this.selectedStrategy() === list[index]) this.selectedStrategy.set('เลือกแผนยุทธศาสตร์');
      list.splice(index, 1);
      this.strategiesList.set([...list]);
      localStorage.setItem('custom_strategies', JSON.stringify(list)); 
    }
  }
  addNewStrategy(val: string) {
    if (val.trim()) {
      const newList = [...this.strategiesList(), val.trim()];
      this.strategiesList.set(newList);
      this.selectedStrategy.set(val.trim());
      this.isAddingStrategy.set(false);
      localStorage.setItem('custom_strategies', JSON.stringify(newList)); 
    }
  }

  togglePlan() { this.isPlanOpen.set(!this.isPlanOpen()); this.isStrategyOpen.set(false); this.isStatusOpen.set(false); }
  selectPlan(item: string) { this.selectedPlan.set(item); this.isPlanOpen.set(false); }
  
  startEditPlan(index: number, event: Event) { event.stopPropagation(); this.editingPlanIndex.set(index); }
  cancelEditPlan(event: Event) { event.stopPropagation(); this.editingPlanIndex.set(null); }
  saveEditPlan(index: number, val: string, event: Event) {
    event.stopPropagation();
    if (val.trim()) {
      const list = this.plansList();
      if (this.selectedPlan() === list[index]) this.selectedPlan.set(val.trim());
      list[index] = val.trim();
      this.plansList.set([...list]);
      localStorage.setItem('custom_plans', JSON.stringify(list)); 
    }
    this.editingPlanIndex.set(null);
  }
  deletePlan(index: number, event: Event) {
    event.stopPropagation();
    if (confirm('ยืนยันการลบแผนงานนี้?')) {
      const list = this.plansList();
      if (this.selectedPlan() === list[index]) this.selectedPlan.set('เลือกแผนงาน');
      list.splice(index, 1);
      this.plansList.set([...list]);
      localStorage.setItem('custom_plans', JSON.stringify(list)); 
    }
  }
  addNewPlan(val: string) {
    if (val.trim()) {
      const newList = [...this.plansList(), val.trim()];
      this.plansList.set(newList);
      this.selectedPlan.set(val.trim());
      this.isAddingPlan.set(false);
      localStorage.setItem('custom_plans', JSON.stringify(newList)); 
    }
  }

  toggleStatus() { this.isStatusOpen.set(!this.isStatusOpen()); this.isStrategyOpen.set(false); this.isPlanOpen.set(false); }
  selectStatus(item: string) { this.selectedStatus.set(item); this.isStatusOpen.set(false); }

  addParticipant() { this.participants.push({ staff_id: '' }); }
  removeParticipant(index: number) { if (this.participants.length > 1) { this.participants.splice(index, 1); } }

  addSubActivity() { this.subActivities.update(items => [...items, { id: Date.now(), value: '' }]); }
  removeSubActivity(id: number) { this.subActivities.update(items => items.filter(item => item.id !== id)); }
  updateSubActivity(id: number, newValue: string) { this.subActivities.update(items => items.map(item => item.id === id ? { ...item, value: newValue } : item)); }

  // 🌟 ฟังก์ชันจัดการไฟล์แบบเสนอ
  onProposalSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('❌ กรุณาเลือกเฉพาะไฟล์ PDF เท่านั้นครับ');
        event.target.value = '';
        return;
      }
      if (file.size > 5242880) {
        alert('❌ ขนาดไฟล์ใหญ่เกินไป! กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5 MB ครับ');
        event.target.value = ''; 
        return;
      }
      this.selectedProposalName.set(file.name);
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.proposalFile = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // 🌟 ฟังก์ชันจัดการไฟล์แบบสรุป
  onSummarySelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('❌ กรุณาเลือกเฉพาะไฟล์ PDF เท่านั้นครับ');
        event.target.value = '';
        return;
      }
      if (file.size > 5242880) {
        alert('❌ ขนาดไฟล์ใหญ่เกินไป! กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5 MB ครับ');
        event.target.value = ''; 
        return;
      }
      this.selectedSummaryName.set(file.name);
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.summaryFile = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  submitForm() {
    if (!this.projectName.trim()) { alert('กรุณาระบุชื่อโครงการ'); return; }
    if (!this.planYear) { alert('กรุณาระบุปี พ.ศ. ที่ดำเนินการ'); return; }
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
      plan_year: this.planYear, 
      strategy: this.selectedStrategy() === 'เลือกแผนยุทธศาสตร์' ? '' : this.selectedStrategy(),
      plan_type: this.selectedPlan() === 'เลือกแผนงาน' ? '' : this.selectedPlan(),
      approved_budget: this.approvedBudget,
      used_budget: this.usedBudget,
      status: this.selectedStatus() === 'ระบุสถานะ' ? 'ยังไม่ได้ดำเนินการ' : this.selectedStatus(),
      details: this.details,
      proposal_file: this.proposalFile, 
      summary_file: this.summaryFile, 
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