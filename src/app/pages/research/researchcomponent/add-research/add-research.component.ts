<<<<<<< HEAD
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms'; // 👈 นำเข้า FormsModule เพื่อใช้ ngModel
=======
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
>>>>>>> 8baf7027f9f6be3155fdb25be2078051f44dc5e3

@Component({
  selector: 'app-add-research',
  standalone: true,
<<<<<<< HEAD
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
=======
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './add-research.component.html',
  styleUrl: './add-research.component.css'
})
export class AddResearchComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);

  staffMembers = signal<any[]>([]);
  loading = signal(false);
  isSubmitting = signal(false);
  userScope = signal<string>('none'); 

  // 🌟 ปรับกลับมาเก็บเป็นตัวเลขปี พ.ศ. โดยตรง (Default เป็นปี พ.ศ. ปัจจุบัน)
  formData = {
    title: '',
    dept_id: '3', 
    year_funded: new Date().getFullYear() + 543, // ปี พ.ศ. ที่ได้รับทุน
    year_ended: new Date().getFullYear() + 543,  // ปี พ.ศ. ที่สิ้นสุดทุน
    funding_source: '',
    budget: null,
    authors: [] as Array<{ staff_id: string; role: string }>
  };

  ngOnInit() {
    this.addAuthorRow(); 
    this.loadActiveStaff();
>>>>>>> 8baf7027f9f6be3155fdb25be2078051f44dc5e3
  }

  loadActiveStaff() {
    this.loading.set(true);
    const currentUserId = localStorage.getItem('user_id') || '14';
    const headers = new HttpHeaders().set('X-User-Id', currentUserId);
    
    this.http.get<any>('http://localhost:8080/api/add_research.php', { headers })
      .subscribe({
        next: (res) => {
          if (res && res.success) {
            this.userScope.set(res.scope);
            this.staffMembers.set(res.staff_list || []);
            
            if ((res.scope === 'department' || res.scope === 'self') && res.my_dept_id) {
              this.formData.dept_id = res.my_dept_id.toString();
            }

            if (res.scope === 'self' && res.staff_list.length > 0) {
              this.formData.authors[0].staff_id = res.staff_list[0].staff_id.toString();
            }
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          alert('❌ ไม่สามารถดึงข้อมูลแบบฟอร์มได้: ' + (err.error?.message || 'Unauthorized'));
          this.loading.set(false);
        }
      });
  }

  addAuthorRow() {
    this.formData.authors.push({ staff_id: '', role: 'หัวหน้าโครงการ' });
  }

  removeAuthorRow(index: number) {
    if (this.formData.authors.length > 1) {
      this.formData.authors.splice(index, 1);
    } else {
      alert('โครงการวิจัยจำเป็นต้องมีผู้รับผิดชอบอย่างน้อย 1 คนครับ');
    }
  }

  submitForm() {
    if (!this.formData.title.trim() || !this.formData.funding_source.trim() || !this.formData.year_funded || !this.formData.year_ended) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วนก่อนทำการบันทึกครับ');
      return;
    }

    // 🌟 ตรวจสอบเงื่อนไขปีสิ้นสุดต้องไม่น้อยกว่าปีที่เริ่มได้รับทุน
    if (Number(this.formData.year_funded) > Number(this.formData.year_ended)) {
      alert('❌ ข้อผิดพลาดข้อมูล: ปี พ.ศ. ที่สิ้นสุดทุน จะต้องไม่น้อยกว่าปี พ.ศ. ที่เริ่มได้รับทุนสนับสนุนครับ');
      return;
    }

    const hasEmptyAuthor = this.formData.authors.some(a => !a.staff_id);
    if (hasEmptyAuthor) {
      alert('กรุณาเลือกชื่ออาจารย์ในช่องที่มีอยู่ให้ครบถ้วนครับ');
      return;
    }

    this.isSubmitting.set(true);
    const currentUserId = localStorage.getItem('user_id') || '14';
    const headers = new HttpHeaders().set('X-User-Id', currentUserId);

    // 🌟 ส่งค่า formData ไปหา PHP ตรงๆ ได้เลย เพราะค่าเป็นตัวเลขปี พ.ศ. อยู่แล้ว
    this.http.post<any>('http://localhost:8080/api/add_research.php', this.formData, { headers })
      .subscribe({
        next: (res) => {
          if (res && res.success) {
            alert('✅ บันทึกสำเร็จ: ' + res.message);
            this.router.navigate(['/research']); 
          } else {
            alert('❌ ปฏิเสธการบันทึก: ' + res.message);
            this.isSubmitting.set(false);
          }
        },
        error: (err) => {
          console.error(err);
          alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + (err.error?.message || 'Server Error'));
          this.isSubmitting.set(false);
        }
      });
  }
}