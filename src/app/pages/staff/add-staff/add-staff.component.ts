import { Component, inject } from '@angular/core'; // 👈 ลบ signal ออกแล้ว
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
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

  modules: any[] = [
    { id: 1, name: 'Dashboard', subName: 'แดชบอร์ด', moduleCode: 'Dashboard', isDashboard: true, viewAccess: true, view: 'all', add: 'none', edit: 'none' },
    { id: 2, name: 'Staff Info', subName: 'ข้อมูลบุคลากร', moduleCode: 'Staff_info', isDashboard: false, viewAccess: false, view: 'none', add: 'none', edit: 'none' },
    { id: 3, name: 'Research Info', subName: 'ข้อมูลวิจัย', moduleCode: 'Research_info', isDashboard: false, viewAccess: false, view: 'none', add: 'none', edit: 'none' },
    { id: 4, name: 'Plans / Projects', subName: 'แผนงาน / โครงการ', moduleCode: 'Plan_Project', isDashboard: false, viewAccess: false, view: 'none', add: 'none', edit: 'none' },
    { id: 5, name: 'Training', subName: 'ข้อมูลอบรม', moduleCode: 'Training', isDashboard: false, viewAccess: false, view: 'none', add: 'none', edit: 'none' }
  ];

  // ⭐️ เปลี่ยนมาใช้ Boolean ธรรมดา
  showSuccessModal = false; 
  loading = false;

  onSubmit() {
    this.loading = true;

    const permissionsToSend = this.modules.map(mod => ({
      module_name: mod.moduleCode,
      view: mod.isDashboard ? (mod.viewAccess ? 'all' : 'none') : mod.view,
      add: mod.add,
      edit: mod.edit
    }));

    const payload = {
      ...this.staffData,
      permissions: permissionsToSend
    };

    console.log('กำลังส่งข้อมูล:', payload);

    this.http.post('http://localhost/api/add_staff.php', payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) {
          this.showSuccessModal = true; // ⭐️ กำหนดค่าแบบปกติ
        } else {
          alert('บันทึกไม่สำเร็จ: ' + res.message);
        }
      },
      error: (err) => {
        this.loading = false;
        alert('เชื่อมต่อ API ผิดพลาด');
        console.error(err);
      }
    });
  }

  closeModal() {
    this.showSuccessModal = false; // ⭐️ กำหนดค่าแบบปกติ
    this.router.navigate(['/staff']);
  }
}