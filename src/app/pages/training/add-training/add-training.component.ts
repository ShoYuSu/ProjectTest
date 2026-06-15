import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-training',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './add-training.component.html'
})
export class AddTrainingComponent {
  private router = inject(Router);

  // --- ตัวแปรสำหรับใช้หน้า UI ---
  searchQuery = '';
  participants = [{ name: '' }];

  // --- ตัวแปรสำหรับจัดการ Custom Dropdown ---
  isDropdownOpen = false;
  newBenefit = '';               // ค่าสำหรับเพิ่มรายการใหม่
  editingIndex: number | null = null; // เช็คว่ากำลังแก้ไขรายการไหนอยู่
  editValue = '';                // ค่าชั่วคราวตอนกำลังพิมพ์แก้ไข

  benefitOptions = [
    'ด้านการบริหารหลักสูตร',
    'ด้านการจัดการเรียนการสอน',
    'ด้านการวิจัย',
    'ด้านการบริหารจัดการ'
  ];

  // --- ⭐️ ตัวแปรหลัก (แยกวันที่เริ่มและสิ้นสุดแล้ว) ---
  trainingData = {
    staffName: '',       
    topic: '',           
    startDate: '',       // 👈 แยกวันที่เริ่ม
    endDate: '',         // 👈 แยกวันที่สิ้นสุด
    location: '',        
    benefits: '',        
    implementation: '',  
    remarks: '',         
    cost: null as number | null 
  };

  loading = false;
  showSuccessModal = false;

  // --- ฟังก์ชันรายชื่อ ---
  addParticipant() {
    this.participants.push({ name: '' });
  }

  removeParticipant(index: number) {
    if (this.participants.length > 1) {
      this.participants.splice(index, 1);
    }
  }

  // --- ฟังก์ชันจัดการ Dropdown (เพิ่ม, ลบ, แก้ไข, เลือก) ---
  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
    this.editingIndex = null; // ปิดโหมดแก้ไขทุกครั้งที่เปิด/ปิด dropdown
  }

  selectBenefit(opt: string) {
    this.trainingData.benefits = opt;
    this.isDropdownOpen = false; // เลือกเสร็จให้พับเก็บ
  }

  addNewBenefit(event: Event) {
    event.stopPropagation(); // กัน dropdown หุบ
    if (this.newBenefit.trim()) {
      this.benefitOptions.push(this.newBenefit.trim());
      this.trainingData.benefits = this.newBenefit.trim(); // เลือกอันที่เพิ่งเพิ่มให้อัตโนมัติ
      this.newBenefit = ''; // เคลียร์ช่องพิมพ์
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
      // ถ้าอันที่แก้ ดันเป็นอันที่เลือกไว้อยู่ ต้องอัพเดทค่าที่เลือกด้วย
      if (this.trainingData.benefits === this.benefitOptions[index]) {
        this.trainingData.benefits = this.editValue.trim();
      }
      this.benefitOptions[index] = this.editValue.trim();
    }
    this.editingIndex = null; // ออกจากโหมดแก้ไข
  }

  deleteBenefit(index: number, event: Event) {
    event.stopPropagation();
    if (confirm('ยืนยันการลบรายการนี้?')) {
      if (this.trainingData.benefits === this.benefitOptions[index]) {
        this.trainingData.benefits = ''; // ถ้าลบอันที่เลือกอยู่ ให้ล้างค่าทิ้ง
      }
      this.benefitOptions.splice(index, 1);
    }
  }

  // --- ฟังก์ชันบันทึกข้อมูล ---
  onSubmit() {
    this.loading = true;
    
    // รวบชื่อทุกคนในตาราง
    this.trainingData.staffName = this.participants.map(p => p.name).join(', ');
    
    // ⭐️ ไม่ต้องเอาวันที่มาต่อกันแล้ว ส่งไปตรงๆ ได้เลย
    console.log('ข้อมูลที่พร้อมส่งเข้า DB (แยกวันที่แล้ว):', this.trainingData);
    
    setTimeout(() => {
      this.loading = false;
      this.showSuccessModal = true;
    }, 1000);
  }

  closeModal() {
    this.showSuccessModal = false;
    this.router.navigate(['/training']); 
  }
}