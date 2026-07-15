import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router'; 
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin } from 'rxjs'; 

@Component({
  selector: 'app-add-training',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './add-training.component.html',
  styleUrl: './add-training.component.css'
})
export class AddTrainingComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute); 

  isEditMode = signal(false);
  editId: string | null = null;
  loading = false;

  participants: Array<{ staff_id: string }> = [{ staff_id: '' }]; 
  
  staffMembers = signal<any[]>([]);
  userScope = signal<string>('none'); 
  currentStaffId = signal<string>(''); 

  isDropdownOpen = false;
  newBenefit = '';               
  editingIndex: number | null = null; 
  editValue = '';                

  benefitOptions = [
    'ด้านการบริหารหลักสูตร',
    'ด้านการจัดการเรียนการสอน',
    'ด้านการวิจัย',
    'ด้านการบริหารจัดการ'
  ];

  trainingData = {
    topic: '',           
    startDate: '',       
    endDate: '',         
    location: '',        
    cost: null as number | null,             
    benefits: '',        
    implementation: '',  
    remarks: ''          
  };

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
    
    let setupUrl = 'http://localhost:8080/api/add_training.php';
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

        // 🌟 Permission-Based Only
        let scope = 'none';
        const p = res.perms.permissions || res.perms || {};
        const modPerms = p['training_info'] || p['training'];
        
        if (modPerms) {
           const targetAction = this.isEditMode() ? 'edit' : 'add';
           if (modPerms[targetAction]) {
              scope = modPerms[targetAction].toString().toLowerCase().trim();
           }
        }
        this.userScope.set(scope);

        if (this.isEditMode() && res.setupData.training_data) {
          const td = res.setupData.training_data;
          this.trainingData.topic = td.topic || '';
          this.trainingData.startDate = td.start_date || '';
          this.trainingData.endDate = td.end_date || '';
          this.trainingData.location = td.location || '';
          this.trainingData.cost = td.cost ? Number(td.cost) : null;
          this.trainingData.benefits = td.benefits || '';
          this.trainingData.implementation = td.implementation || '';
          this.trainingData.remarks = td.remarks || '';
          
          if (td.participants && td.participants.length > 0) {
            this.participants = td.participants;
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

  addParticipant() { this.participants.push({ staff_id: '' }); }
  removeParticipant(index: number) { if (this.participants.length > 1) { this.participants.splice(index, 1); } }

  // --- Benefits Dropdown Logic ---
  toggleDropdown() { this.isDropdownOpen = !this.isDropdownOpen; }
  selectBenefit(option: string) { this.trainingData.benefits = option; this.isDropdownOpen = false; }
  startEdit(index: number, value: string, event: Event) { event.stopPropagation(); this.editingIndex = index; this.editValue = value; }
  saveEdit(index: number) {
    if (this.editValue.trim() !== '') {
      this.benefitOptions[index] = this.editValue.trim();
      if (this.trainingData.benefits === this.benefitOptions[index]) {
        this.trainingData.benefits = this.editValue.trim();
      }
    }
    this.editingIndex = null;
  }
  cancelEdit() { this.editingIndex = null; }
  deleteBenefit(index: number, event: Event) {
    event.stopPropagation();
    if (confirm('ยืนยันการลบตัวเลือกนี้?')) {
      if (this.trainingData.benefits === this.benefitOptions[index]) { this.trainingData.benefits = ''; }
      this.benefitOptions.splice(index, 1);
    }
  }
  addNewBenefit() {
    if (this.newBenefit.trim() !== '') {
      this.benefitOptions.push(this.newBenefit.trim());
      this.trainingData.benefits = this.newBenefit.trim();
      this.newBenefit = '';
      this.isDropdownOpen = false;
    }
  }
  // --- End Benefits Dropdown Logic ---

  onSubmit() {
    if (!this.trainingData.topic || !this.trainingData.startDate || !this.trainingData.endDate) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (หัวข้อ, วันที่เริ่มต้น-สิ้นสุด)'); return;
    }

    if (this.participants.some(p => !p.staff_id)) {
      alert('กรุณาเลือกชื่อผู้เข้าร่วมให้ครบในช่องที่เพิ่มไว้ครับ'); return;
    }

    if (this.userScope() === 'self' && this.currentStaffId()) {
      const hasSelf = this.participants.some(p => p.staff_id.toString() === this.currentStaffId().toString());
      if (!hasSelf) {
        alert('❌ ในฐานะผู้ใช้งานทั่วไป คุณจำเป็นต้องระบุชื่อตนเองเป็นหนึ่งในผู้เข้าร่วมการอบรมด้วยครับ');
        return;
      }
    }

    this.loading = true;
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const payload = {
      id: this.editId,
      title: this.trainingData.topic,             
      start_date: this.trainingData.startDate,    
      end_date: this.trainingData.endDate,        
      location: this.trainingData.location,
      budget: this.trainingData.cost,             
      benefits: this.trainingData.benefits,
      implementation: this.trainingData.implementation,
      remarks: this.trainingData.remarks,
      participants: this.participants
    };
    
    const apiUrl = this.isEditMode() 
      ? 'http://localhost:8080/api/update_training.php' 
      : 'http://localhost:8080/api/add_training.php';

    this.http.post<any>(apiUrl, payload, { headers })
      .subscribe({
        next: (res) => {
          if (res && res.success) {
            alert('✅ บันทึกข้อมูลการอบรมสำเร็จ!');
            this.router.navigate(['/training']); 
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