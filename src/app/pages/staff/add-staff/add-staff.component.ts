import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms'; 

@Component({
  selector: 'app-add-staff',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule], 
  templateUrl: './add-staff.component.html',
  styleUrl: './add-staff.component.css'
})
export class AddStaffComponent {
  private http = inject(HttpClient);
  private router = inject(Router);

  staffData = {
    staffCode: '',
    fullName: '',
    email: '',
    deptId: null, 
    position: 'อาจารย์' 
  };

  imagePreview = signal<string | null>(null);

  modules: any[] = [
    { id: 1, name: 'Dashboard', subName: 'แดชบอร์ด', moduleCode: 'Dashboard', isDashboard: true, viewAccess: true, view: 'all', add: 'none', edit: 'none' },
    { id: 2, name: 'Staff Info', subName: 'ข้อมูลบุคลากร', moduleCode: 'Staff_info', isDashboard: false, viewAccess: false, view: 'none', add: 'none', edit: 'none' },
    { id: 3, name: 'Research Info', subName: 'ข้อมูลวิจัย', moduleCode: 'Research_info', isDashboard: false, viewAccess: false, view: 'none', add: 'none', edit: 'none' },
    { id: 4, name: 'Plans / Projects', subName: 'แผนงาน / โครงการ', moduleCode: 'Plan_Project', isDashboard: false, viewAccess: false, view: 'none', add: 'none', edit: 'none' },
    { id: 5, name: 'Training', subName: 'ข้อมูลอบรม', moduleCode: 'Training', isDashboard: false, viewAccess: false, view: 'none', add: 'none', edit: 'none' }
  ];

  showSuccessModal = false; 
  loading = false;

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  private mapScopeToDatabase(scopeValue: string): string {
    if (scopeValue === 'own') return 'self';
    if (scopeValue === 'dept') return 'department';
    return scopeValue; 
  }

  onSubmit() {
    if (!this.staffData.fullName || !this.staffData.staffCode || !this.staffData.email) {
      alert('กรุณากรอกข้อมูลพื้นฐานให้ครบถ้วน');
      return;
    }

    this.loading = true;

    const permissionsToSend = this.modules.map(mod => ({
      module_name: mod.moduleCode,
      view: mod.isDashboard ? (mod.viewAccess ? 'all' : 'none') : this.mapScopeToDatabase(mod.view),
      add: this.mapScopeToDatabase(mod.add),
      edit: this.mapScopeToDatabase(mod.edit)
    }));

    const payload = {
      fullName: this.staffData.fullName,
      staffCode: this.staffData.staffCode,
      email: this.staffData.email,
      deptId: this.staffData.deptId,
      position: this.staffData.position,
      image: this.imagePreview(), 
      permissions: permissionsToSend
    };

    const currentUserId = localStorage.getItem('user_id') || '14';
    const headers = new HttpHeaders().set('X-User-Id', currentUserId);

    // ยิงไปพอร์ต 8080 อย่างแม่นยำ
    this.http.post('http://localhost:8080/api/add_staff.php', payload, { headers }).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res && res.success) {
          this.showSuccessModal = true; 
        } else {
          // ถ้าเกิดบั๊กจากฝั่ง DB มันจะแจ้งเตือนขึ้นมาตรงๆ ทันที
          alert('บันทึกไม่สำเร็จ: ' + (res?.message || 'ข้อผิดพลาดไม่ทราบสาเหตุ'));
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('API Error:', err);
        alert(`เชื่อมต่อเซิร์ฟเวอร์เพื่อบันทึกข้อมูลล้มเหลว (Add Staff)\nสถานะ: ${err.status}\nพอร์ต 8080 ถูกต้องหรือไม่?`);
      }
    });
  }

  closeModal() {
    this.showSuccessModal = false; 
    this.router.navigate(['/staff']);
  }
}