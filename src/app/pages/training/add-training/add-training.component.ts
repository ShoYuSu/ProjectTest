import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router'; 
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

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

  searchQuery = '';
  participants = [{ staff_id: '' }]; 
  
  staffMembers = signal<any[]>([]);
  userScope = signal<string>('none'); 

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
    benefits: '',        
    implementation: '',  
    remarks: '',         
    cost: null as number | null 
  };

  loading = false;
  // showSuccessModal = false; // 🌟 ปิดการใช้งาน Modal ไว้ เพราะเราใช้ Alert แทนแล้ว

  ngOnInit() {
    this.loadActiveStaff();

    this.route.queryParams.subscribe(params => {
      if (params['edit']) {
        this.isEditMode.set(true);
        this.editId = params['edit'];
        
        const state = history.state;
        if (state && state.trainingData) {
          const data = state.trainingData;
          
          // Data Mapping ขาเข้า (โหลดมาแสดงบนฟอร์ม)
          this.trainingData.topic = data.title || data.topic || ''; 
          this.trainingData.startDate = data.start_date || data.startDate || ''; 
          this.trainingData.endDate = data.end_date || data.endDate || ''; 
          this.trainingData.location = data.location || '';
          this.trainingData.benefits = data.benefits || '';
          this.trainingData.implementation = data.implementation || '';
          this.trainingData.remarks = data.remarks || '';
          this.trainingData.cost = data.budget ? Number(data.budget) : (data.cost ? Number(data.cost) : null); 

          if (data.benefits && !this.benefitOptions.includes(data.benefits)) {
            this.benefitOptions.push(data.benefits);
          }

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
    
    this.http.get<any>('http://localhost:8080/api/add_training.php', { headers })
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

  addParticipant() { this.participants.push({ staff_id: '' }); }
  removeParticipant(index: number) { if (this.participants.length > 1) this.participants.splice(index, 1); }
  toggleDropdown() { this.isDropdownOpen = !this.isDropdownOpen; this.editingIndex = null; }
  selectBenefit(opt: string) { this.trainingData.benefits = opt; this.isDropdownOpen = false; }

  addNewBenefit(event: Event) {
    event.stopPropagation();
    if (this.newBenefit.trim()) {
      this.benefitOptions.push(this.newBenefit.trim());
      this.trainingData.benefits = this.newBenefit.trim();
      this.newBenefit = '';
    }
  }

  startEdit(index: number, opt: string, event: Event) {
    event.stopPropagation();
    this.editingIndex = index;
    this.editValue = opt;
  }

  saveEdit(index: number, event: Event) {
    event.stopPropagation();
    if (this.editValue.trim()) {
      if (this.trainingData.benefits === this.benefitOptions[index]) {
        this.trainingData.benefits = this.editValue.trim();
      }
      this.benefitOptions[index] = this.editValue.trim();
    }
    this.editingIndex = null;
  }

  deleteBenefit(index: number, event: Event) {
    event.stopPropagation();
    if (confirm('ยืนยันการลบรายการนี้?')) {
      if (this.trainingData.benefits === this.benefitOptions[index]) {
        this.trainingData.benefits = ''; 
      }
      this.benefitOptions.splice(index, 1);
    }
  }

  onSubmit() {
    if (!this.trainingData.topic.trim() || !this.trainingData.startDate) {
      alert('กรุณากรอกหัวข้ออบรมและวันที่เริ่มต้นให้ครบถ้วน');
      return;
    }
    
    if (this.participants.some(p => !p.staff_id)) {
      alert('กรุณาเลือกรายชื่อผู้เข้าอบรมในช่องว่างให้ครบ');
      return;
    }

    if (this.trainingData.endDate && new Date(this.trainingData.startDate) > new Date(this.trainingData.endDate)) {
      alert('วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น');
      return;
    }

    this.loading = true;
    const currentUserId = localStorage.getItem('user_id') || '0';
    const headers = new HttpHeaders().set('X-User-Id', currentUserId);

    // Data Mapping ขาออก
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
            // 🌟 แจ้งเตือนและกลับหน้าหลัก
            alert('✅ บันทึกข้อมูลการอบรมสำเร็จ!');
            this.router.navigate(['/training']); 
          } else {
            alert('❌ ' + res.message);
          }
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
          this.loading = false;
        }
      });
  }

  // closeModal() {
  //   this.showSuccessModal = false;
  //   this.router.navigate(['/training']); 
  // }
}