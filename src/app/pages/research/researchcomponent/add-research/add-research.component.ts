import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms'; // 👈 นำเข้า FormsModule เพื่อใช้ ngModel

@Component({
  selector: 'app-add-research',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule], // 👈 เพิ่ม FormsModule ตรงนี้
  templateUrl: './add-research.component.html',
  styleUrl: './add-research.component.css'
})
export class AddResearchComponent {
  
  // ตัวแปรสำหรับช่องค้นหา
  searchQuery: string = '';

  // ใช้รูปแบบ Array ปกติ เพื่อให้จัดการข้อมูลและการแก้ไขบทบาท (isEditingRole) ได้ง่ายขึ้น
  participants = [
    { name: '', role: 'หัวหน้าโครงการวิจัย', isEditingRole: false }
  ];

  addParticipant() {
    this.participants.push({ name: '', role: 'ผู้ร่วมวิจัย', isEditingRole: false });
  }

  removeParticipant(index: number) {
    if (this.participants.length > 1) {
      this.participants.splice(index, 1);
    }
  }

}