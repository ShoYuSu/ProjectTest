import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
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

  searchQuery = '';
  // 🌟 เปลี่ยนจาก name เป็น staff_id เพื่อบันทึกลงฐานข้อมูล
  participants = [{ staff_id: '' }]; 
  
  // 🌟 เพิ่มตัวแปรสำหรับรับข้อมูลจาก API และจัดการสิทธิ์
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
  showSuccessModal = false;

  ngOnInit() {
    this.loadActiveStaff();
  }

  // ดึงข้อมูลอาจารย์ที่อิงตามสิทธิ์
  loadActiveStaff() {
    const currentUserId = localStorage.getItem('user_id') || '14';
    const headers = new HttpHeaders().set('X-User-Id', currentUserId);
    
    this.http.get<any>('http://localhost:8080/api/add_training.php', { headers })
      .subscribe({
        next: (res) => {
          if (res && res.success) {
            this.userScope.set(res.scope);
            this.staffMembers.set(res.staff_list || []);
            
            // ล็อคชื่อถ้าเป็นสิทธิ์ self
            if (res.scope === 'self' && res.staff_list.length > 0) {
              this.participants[0].staff_id = res.staff_list[0].staff_id.toString();
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
    
    // ตรวจสอบว่าเลือกรายชื่ออาจารย์ครบหรือยัง
    if (this.participants.some(p => !p.staff_id)) {
      alert('กรุณาเลือกรายชื่อผู้เข้าอบรมในช่องว่างให้ครบ');
      return;
    }

    if (this.trainingData.endDate && new Date(this.trainingData.startDate) > new Date(this.trainingData.endDate)) {
      alert('วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น');
      return;
    }

    this.loading = true;
    const currentUserId = localStorage.getItem('user_id') || '14';
    const headers = new HttpHeaders().set('X-User-Id', currentUserId);

    const payload = {
      ...this.trainingData,
      participants: this.participants
    };
    
    this.http.post<any>('http://localhost:8080/api/add_training.php', payload, { headers })
      .subscribe({
        next: (res) => {
          if (res && res.success) {
            this.showSuccessModal = true;
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

  closeModal() {
    this.showSuccessModal = false;
    this.router.navigate(['/training']); 
  }
}